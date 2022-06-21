# PR-Guru


PR-Guru is a Slack app that makes the code review process more efficient!

It allows users to retrieve the code-review stats of their teammates and assign reviewers to a PR.

# Overall Design

PR-Guru is an NodeJS Express application written in Typescript.

The bulk of the logic is located in `src/routes/index.ts`. This is where you'll find the two routes: `/stats` and `/assign`.

The project makes use of the GitHub API. The following endpoints have been used:
- [GET /orgs/{org}/repos](https://docs.github.com/en/rest/reference/repos#list-organization-repositories)
- [GET /repos/{owner}/{repo}/pulls](https://docs.github.com/en/rest/reference/pulls#list-pull-requests)
- [POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers](https://docs.github.com/en/rest/reference/pulls#request-reviewers-for-a-pull-request)

## /stats
The `/stats` endpoint will return the number of PRs a team member has been asked to review on GitHub.

The endpoint first retrieves all of the repos in your organization using `GET /orgs/{org}/repos`, then retrieves all of the pull requests from the repos using `GET /repos/{owner}/{repo}/pulls`, then obtains the number of times a user has been tagged as a reviewer from the response of the previous request.

Since there are many API calls to be made here, the response can be quite slow - exceeding the 3000ms timeout of the Slack-api. As such, the endpoint first returns a 200 to notify the user that the results are currently processed. Once all of the operations are completed, the endpoint makes a request to the Slack `response_url` webhook which will display the results to the user.

## /assign
The `/assign` endpoint will assign user(s) as reviewers on a particular PR.

The endpoint first validates whether the 3 mandatory params are present:
 - `repo`: the name of the repository
 - `pullNumber`: the unique identifier of the pull request as seen on GitHub
 - `reviewers`: an array containing GitHub usernames

If there are any issues with the validation, the endpoint will return a 200 response with an error message.

Next, the users will be added as reviewers on the pull request using the `POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers` endpoint.

Finally, pertinent information will be pulled from the response of the aforementioned API request and placed in the playload for user viewing.
