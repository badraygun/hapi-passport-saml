const Boom = require('boom');
import { SchemeConfig } from './SchemeConfig';
import { HapiSaml } from './HapiSaml';
import { Request } from 'hapi';
export const SchemeAuthenticate = (
  saml: HapiSaml,
  settings: SchemeConfig,
  samlCredsPropKey: string
) => async (request: Request, h: any) => {
  const state = request.state;
  let session = state[settings.cookie];

  if (!session) {
    const loginUrl = await new Promise((resolve, reject) => {
      saml.getSamlLib().getAuthorizeUrl(
        {
          headers: request.headers,
          body: request.payload,
          query: request.query
        },
        saml.props,
        function(err: any, loginUrl: string) {
          if(err) reject(err);
          else resolve(loginUrl);
        });
    });

    const idpLoginUrl = new URL(loginUrl.toString());
    idpLoginUrl.search = `RelayState=${request.path}`;
    return h.redirect(idpLoginUrl).takeover();
  }

  if (session && session[samlCredsPropKey]) {
    if(settings.keepAlive) {
      h.state(settings.cookie, session);
    }
    return h.authenticated({
      credentials: session[samlCredsPropKey]
    });
  }
  if (request.auth.mode === 'try') {
    throw Boom.unauthorized('Not authenticated');
  }

  throw Boom.unauthorized('Unauthorized', 'saml');
};
