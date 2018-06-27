signInWidgetConfig = {
  // Enable or disable widget functionality with the following options. Some of these features require additional configuration in your Okta admin settings. Detailed information can be found here: https://github.com/okta/okta-signin-widget#okta-sign-in-widget
  // Look and feel changes:
  logo: '{{ page.okta.logo }}',           // Try changing "okta.com" to other domains, like: "workday.com", "splunk.com", or "delmonte.com"
  language: 'en',                                 // Try: [fr, de, es, ja, zh-CN] Full list: https://github.com/okta/okta-signin-widget#language-and-text
  i18n: {
    //Overrides default text when using English. Override other languages by adding additional sections.
    'en': {
      'primaryauth.title': 'Sign In',             // Changes the sign in text
      'primaryauth.submit': 'Sign In',            // Changes the sign in button
      // More e.g. [primaryauth.username.placeholder,  primaryauth.password.placeholder, needhelp, etc.].
      // Full list here: https://github.com/okta/okta-signin-widget/blob/master/packages/@okta/i18n/dist/properties/login.properties
    }
  },
  features: {
    registration: true,                           // Enable self-service registration flow
    rememberMe: true,                             // Setting to false will remove the checkbox to save username
    //multiOptionalFactorEnroll: true,            // Allow users to enroll in multiple optional factors before finishing the authentication flow.
    //selfServiceUnlock: true,                    // Will enable unlock in addition to forgotten password
    //smsRecovery: true,                          // Enable SMS-based account recovery
    //callRecovery: true,                         // Enable voice call-based account recovery
    router: true,                                 // Leave this set to true for this demo
  },
  baseUrl: '{{ page.okta.baseUrl }}',
  clientId: '{{ page.okta.clientId }}',
  redirectUri: '{{ page.okta.redirectUri }}',
  authParams: {
    issuer: '{{ page.okta.issuer }}',
    responseType: ['id_token', 'token'],
    scopes: [{{ page.okta.defaultScopes }}],
  },
};

signInWidget = new OktaSignIn(signInWidgetConfig);

function widgetSuccessCallback(res) {
        var key = '';
        if (res[0]) {
          key = Object.keys(res[0])[0];
          signInWidget.tokenManager.add(key, res[0]);
        }
        if (res[1]) {
          key = Object.keys(res[1])[0];
          signInWidget.tokenManager.add(key, res[1]);
        }
        if (res.status === 'SUCCESS') {
          oktaToken = signInWidget.tokenManager.get(key);
          console.log(oktaToken);
          login();
        }
}

function widgetErrorCallback (err) {
}

if(signInWidget.token.hasTokensInUrl()) {
  signInWidget.token.parseTokensFromUrl(
    function success(res) {
      // Save the tokens for later use, e.g. if the page gets refreshed:
      signInWidget.tokenManager.add('accessToken', res[0]);
      signInWidget.tokenManager.add('idToken', res[1]);
      // Remove the tokens from the window location hash
      window.location.hash='';
      login();
    },
    function error(err) {
      console.error(err);
    }
  );
} else {
  signInWidget.renderEl({el: '#nav-home-tab-widget'}, widgetSuccessCallback, widgetErrorCallback);
}
