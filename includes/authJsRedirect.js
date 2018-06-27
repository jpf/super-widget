function authJsRedirect() {
  var config = {
    url: '{{ page.okta.baseUrl }}',
    clientId: '{{ page.okta.clientId }}',
    redirectUri: '{{ page.okta.redirectUri }}',
    issuer: '{{ page.okta.issuer }}'
  };
  var authClient = new OktaAuth(config);
  authClient.token.getWithRedirect({
    responseType: ['token', 'id_token'],
    scopes: ['openid', 'email', 'profile']
  });
}
