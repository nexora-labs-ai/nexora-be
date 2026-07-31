import { registerAs } from '@nestjs/config';

export default registerAs('mezon', () => ({
  clientId: process.env.MEZON_CLIENT_ID,
  clientSecret: process.env.MEZON_CLIENT_SECRET,
  redirectUri: process.env.MEZON_REDIRECT_URI,
  tokenUrl: 'https://oauth2.mezon.ai/oauth2/token',
  userInfoUrl: 'https://oauth2.mezon.ai/userinfo',
}));
