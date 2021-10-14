import _ from 'lodash';
import config from 'config';
import express, { NextFunction, Request, Response } from 'express';
import request from 'request-promise';

const router = express.Router();

const organization : string = config.get('githubApi.organization');
const serverUrl : string = config.get('githubApi.url');
const slackWebhookUrl : string = config.get('slack.webhookUrl');
const apiTeamUsers : string[] = config.get('apiTeamUsers');

router.post('/stats', async (req : Request, res : Response, next : NextFunction) => {
  try {
    // response will take longer than 3000ms
    // respond right away and post a message to the slack webhook once the request is complete
    res.status(200).json({ text: "Just a moment! I'm loading the stats for you :hourglass_flowing_sand:" });

    var userStats: { [key: string] : any } = {};
    for (const user of apiTeamUsers) {
      _.assign(userStats, { [user]: { requested_reviews: 0 } });
    }

    // fetch the last 10 most recently updated repos in the org
    const repos = await request.get(`${serverUrl}/orgs/${organization}/repos`, {
      qs: {
        per_page: 10,
      },
    }).then((response) => JSON.parse(response));

    for (const repo of repos) {
      // get all pulls per repo
      const repoName = repo.name;
      // eslint-disable-next-line no-await-in-loop
      const pulls = await request.get(`${serverUrl}/repos/${organization}/${repoName}/pulls`, {
        qs: {
          per_page: 10,
        },
      }).then((response) => JSON.parse(response));

      for (const pull of pulls) {
        // get requested reviewers per pull
        const reviewers = pull.requested_reviewers;

        // update stats for user
        for (const reviewer of reviewers) {
          if (userStats[reviewer.login]) {
            userStats[reviewer.login].requested_reviews += 1;
          }
        }
      }
    }

    var slackResponse = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: "*Here are your teammates' stats*",
        },
      },
      {
        type: 'divider',
      },
    ];

    // create section for each user
    for (const user of apiTeamUsers) {
      slackResponse.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${user}*\nReview requested: ${userStats[user].requested_reviews}`,
        },
      });
    }

    // send response to the response_url provided by Slack
    const responseUrl = req.body.response_url;
    await request.post(responseUrl, {
      body: {
        blocks: slackResponse,
      },
      json: true,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/assign', async (req : Request, res : Response, next : NextFunction) => {
  try {
    // input from slack command /assign
    // parameter list is [repo] [pr#] [reviewer1] [reviewer2]
    const input = req.body.text.split(' ');

    if (input.length < 3) {
      return res.status(200).json({ text: 'Error: not all required inputs are present' });
    }

    const repo = input[0];
    const pullNumber = parseInt(input[1], 10);
    const reviewers = _.drop(input, 2);

    if (!_.isInteger(pullNumber)) {
      return res.status(200).json({ text: 'Error: field "pr#" must be an integer' });
    }

    const result = await request.post(`${serverUrl}/repos/krpatel/${repo}/pulls/${pullNumber}/requested_reviewers`, {
      body: {
        reviewers,
      },
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
      },
      json: true,
    }).then((response) => response);

    const pullUrl = result.html_url;
    const pullTitle = result.title;
    const pullAuthor = result.user.login;
    const assignedReviewers = result.requested_reviewers.map((reviewer: any) => `@${reviewer.login}`);
    const repoName = result.head.repo.name;

    // tell user that the request has been successful
    res.status(200).json({ text: 'reviewer(s) have been successfully added :raised_hands:' });

    // send slack message to channel to alert teammates
    var slackResponse = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hello :wave:\n Reviews are requested on <${pullUrl}|${pullTitle}>`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Author:*\n${pullAuthor}`,
          },
          {
            type: 'mrkdwn',
            text: `*Repo:*\n${repoName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Reviewers:*\n${_.join(assignedReviewers, ', ')}`,
          }
        ],
      },
      {
        type: 'divider',
      }
    ];

    await request.post(slackWebhookUrl, {
      body: {
        blocks: slackResponse,
      },
      json: true,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
