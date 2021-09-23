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
    let firstContribution: boolean = false;
    let FIRST_LABEL = "FIRST_TIME_CONTRIBUTOR";
    if (isIssue) {
      firstContribution = context.payload.issue?.author_association === FIRST_LABEL;
    } else {
      firstContribution = context.payload.pull_request?.author_association === FIRST_LABEL;
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
    // Add a comment to the appropriate place
    if (isIssue) {
      const issue = context.payload.issue;
      if(!issue){
        return;
      }
      console.log(`Adding message: ${message} to issue ${issue.issue.number}`);
      await client.rest.issues.createComment({
        owner: issue.owner,
        repo: issue.repo,
        issue_number: issue.number,
        body: message
      });
    } else {
      const pull_request = context.payload.pull_request;
      if(!pull_request){
        return;
      }
      await client.rest.pulls.createReview({
        owner: pull_request.owner,
        repo: pull_request.repo,
        pull_number: pull_request.number,
        body: message,
        event: 'COMMENT'
      });
    }
  } catch (error) {
    core.setFailed(error.message);
    return;
  }
}

run();
