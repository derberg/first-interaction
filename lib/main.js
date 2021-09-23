"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const issueMessage = core.getInput('issue-message');
            const prMessage = core.getInput('pr-message');
            if (!issueMessage && !prMessage) {
                throw new Error('Action must have at least one of issue-message or pr-message set');
            }
            // Get client and context
            const client = github.getOctokit(core.getInput('repo-token', { required: true }));
            const context = github.context;
            console.log(JSON.stringify(context));
            if (context.payload.action !== 'opened') {
                console.log('No issue or PR was opened, skipping');
                return;
            }
            // Do nothing if its not a pr or issue
            const isIssue = !!context.payload.issue;
            if (!isIssue && !context.payload.pull_request) {
                console.log('The event that triggered this action was not a pull request or issue, skipping.');
                return;
            }
            // Do nothing if its not their first contribution
            console.log('Checking if its the users first contribution');
            if (!context.payload.sender) {
                throw new Error('Internal error, no sender provided by GitHub');
            }
            const sender = context.payload.sender.login;
            const issue = context.issue;
            let firstContribution = false;
            if (isIssue) {
                firstContribution = yield isFirstIssue(client, issue.owner, issue.repo, issue.number);
            }
            else {
                firstContribution = yield isFirstPull(client, issue.owner, issue.repo, issue.number);
            }
            if (!firstContribution) {
                console.log('Not the users first contribution');
                return;
            }
            // Do nothing if no message set for this type of contribution
            const message = isIssue ? issueMessage : prMessage;
            if (!message) {
                console.log('No message provided for this type of contribution');
                return;
            }
            const issueType = isIssue ? 'issue' : 'pull request';
            // Add a comment to the appropriate place
            console.log(`Adding message: ${message} to ${issueType} ${issue.number}`);
            if (isIssue) {
                yield client.rest.issues.createComment({
                    owner: issue.owner,
                    repo: issue.repo,
                    issue_number: issue.number,
                    body: message
                });
            }
            else {
                yield client.rest.pulls.createReview({
                    owner: issue.owner,
                    repo: issue.repo,
                    pull_number: issue.number,
                    body: message,
                    event: 'COMMENT'
                });
            }
        }
        catch (error) {
            core.setFailed(error.message);
            return;
        }
    });
}
function isFirstIssue(client, owner, repo, curIssueNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Checking...');
        const query = `query {
    repository(owner: "${owner}", name: "${repo}"){
      issue(number: ${curIssueNumber}){
        authorAssociation
      }
    }
  }`;
        const { data: { repository: { issue: { authorAssociation } } } } = yield client.graphql(query);
        console.log(`authorAssociation is: ${authorAssociation}`);
        if (authorAssociation === "FIRST_TIME_CONTRIBUTOR") {
            return true;
        }
        return false;
    });
}
function isFirstPull(client, owner, repo, curPullNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Checking...');
        const query = `query {
    repository(owner: "${owner}", name: "${repo}"){
      pullRequest(number: ${curPullNumber}){
        authorAssociation
      }
    }
  }`;
        const queryResult = yield client.graphql(query);
        console.log(queryResult);
        const { data: { repository: { pullRequest: { authorAssociation } } } } = queryResult;
        console.log(`authorAssociation is: ${authorAssociation}`);
        if (authorAssociation === "FIRST_TIME_CONTRIBUTOR") {
            return true;
        }
        return false;
    });
}
run();
