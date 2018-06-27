function signInWithAuthJs(un, pw) {
  var authClient = new OktaAuth({
    url: '{{ page.okta.baseUrl }}',
    clientId: '{{ page.okta.clientId }}',
    redirectUri: '{{ page.okta.redirectUri }}',
    issuer: '{{ page.okta.issuer }}'
  });

  authClient.signIn({
    username: un,
    password: pw
  })
    .then(function(transaction) {
      if (transaction.status === 'SUCCESS') {
        // Step #1: Get the "sessionToken"
        // console.log('sessionToken = ', transaction.sessionToken);

        
        // Step #2: Retrieve a session cookie via
        //          OpenID Connect Authorization Endpoint
        // - Requires the user be authenticated already
        //   (transaction.sessionToken must exist. See Step #1 above)
        //// FIXME: below is wrong
        // - Uses "response_mode=okta_post_message":
        //   This an Okta-specific response mode that allows a SPA
        //   to establish a session without a page reload
        authClient.token.getWithoutPrompt({
          responseType: ['id_token', 'token'],
          sessionToken: transaction.sessionToken,
          scopes: [{{ page.okta.defaultScopes }}],
        })
          .then(function(tokenOrTokens){
            var token = tokenOrTokens[1];
            loginWith(token.accessToken);
          })
          .catch(function(err){
            console.log(err);
          });
      } else {
        alert('Warning: the ' + transaction.status + ' status is not handled in this code.');
      }
    })
    .fail(function(err) {
      console.error(err);
    });
}

// Then attach to the sign in div
$( "#form-nowidget" ).submit(function( event ) {
  event.preventDefault();
  signInWithAuthJs(
    $( "#inputEmail" ).val(),
    $( "#inputPassword" ).val());
});
