import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHub } from '@actions/github/lib/utils'
async function run() {
  try {
    const issueMessage: string = core.getInput('issue-message');
    const prMessage: string = core.getInput('pr-message');
    if (!issueMessage && !prMessage) {
      throw new Error(
        'Action must have at least one of issue-message or pr-message set'
      );
    }
    // Get client and context
    const client: InstanceType<typeof GitHub> = github.getOctokit(
      core.getInput('repo-token', {required: true})
    );
    const context = github.context;

    if (context.payload.action !== 'opened') {
      console.log('No issue or PR was opened, skipping');
      return;
    }

    // Do nothing if its not a pr or issue
    const isIssue: boolean = !!context.payload.issue;
    if (!isIssue && !context.payload.pull_request) {
      console.log(
        'The event that triggered this action was not a pull request or issue, skipping.'
      );
      return;
    }

    // Do nothing if its not their first contribution
    console.log('Checking if its the users first contribution');
    if (!context.payload.sender) {
      throw new Error('Internal error, no sender provided by GitHub');
    }
    const sender: string = context.payload.sender!.login;
    const issue: {owner: string; repo: string; number: number} = context.issue;
    let firstContribution: boolean = false;
    if (isIssue) {
      firstContribution = await isFirstIssue(
        client,
        issue.owner,
        issue.repo,
        issue.number
      );
    } else {
      firstContribution = await isFirstPull(
        client,
        issue.owner,
        issue.repo,
        issue.number
      );
    }
    if (!firstContribution) {
      console.log('Not the users first contribution');
      return;
    }

    // Do nothing if no message set for this type of contribution
    const message: string = isIssue ? issueMessage : prMessage;
    if (!message) {
      console.log('No message provided for this type of contribution');
      return;
    }

    const issueType: string = isIssue ? 'issue' : 'pull request';
    // Add a comment to the appropriate place
    console.log(`Adding message: ${message} to ${issueType} ${issue.number}`);
    if (isIssue) {
      await client.rest.issues.createComment({
        owner: issue.owner,
        repo: issue.repo,
        issue_number: issue.number,
        body: message
      });
    } else {
      await client.rest.pulls.createReview({
        owner: issue.owner,
        repo: issue.repo,
        pull_number: issue.number,
        body: message,
        event: 'COMMENT'
      });
    }
  } catch (error: any) {
    core.setFailed(error.message);
    return;
  }
}

async function isFirstIssue(
  client: any,
  owner: string,
  repo: string,
  curIssueNumber: number
): Promise<boolean> {
  console.log('Checking...');
  const query = `query {
    repository(owner:${owner}, name:${repo}){
      issue(number: ${curIssueNumber}){
        nodes{
          authorAssociation
        }
      }
    }
  }`;
  const {data: { repository: { issue: { nodes: {authorAssociation} } } } } = await client.graphql(query);
  console.log(`authorAssociation is: ${authorAssociation}`);
  if(authorAssociation === "FIRST_TIME_CONTRIBUTOR"){
    return true;
  }
  return false;
}

async function isFirstPull(
  client: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  curPullNumber: number,
): Promise<boolean> {
  console.log('Checking...');
  const query = `query {
    repository(owner:${owner}, name:${repo}){
      pullRequest(number: ${curPullNumber}){
        nodes{
          authorAssociation
        }
      }
    }
  }`;
  const { data: { repository: { pullRequest: { nodes: {authorAssociation} } } } } = await client.graphql(query);
  console.log(`authorAssociation is: ${authorAssociation}`);
  if(authorAssociation === "FIRST_TIME_CONTRIBUTOR"){
    return true;
  }
  return false;
}

run();
