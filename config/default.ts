export = {
  githubApi: {
    url: '',
    organization: '',
    userAvatarsRepo: '',
  },
  slack: {
    webhookUrl: '',
  },
  apiTeamUsers: [],
  logger: {
    pinoOptions: {
      level: process.env.LOG_LEVEL || 'info',
      prettyPrint: process.env.LOCAL_DEVELOPMENT ?
        {
          colorize: true,
          translateTime: true,
        } :
        {},
    },
  },
  port: 8000,
}
