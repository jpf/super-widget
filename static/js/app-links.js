function showMyAppLinks(userId) {
  // FIXME: We shouldn't assume that localConfig has the value ...
  var baseUrl = localConfig.page.okta.baseUrl;
  signInWidget.session.get(function(sess){
    var xhttp = new XMLHttpRequest();
    url = baseUrl + "/api/v1/users/" + sess.userId + "/appLinks";
    xhttp.open("GET", url, true);
    xhttp.withCredentials = true;
    xhttp.send();
    xhttp.onreadystatechange = function() {
      var res = xhttp.responseText;
      if (res) {
        var linksJson = JSON.parse(res);
        if (linksJson) {
          document.getElementById("my_links").style.display = 'block';
          var apps = new Vue({
            delimiters: ['[[', ']]'],
            el: '#vueapp',
            data: {
              appLinks: linksJson
            }
          });
        }
      }
    }
  });
}

function drawTable(tableData) {
  var i;
  var draw = "";
  for(i = 0; i < tableData.length; i++) {
    draw += '<tr><td>' +
      '<a href="' + tableData[i].linkUrl + '" target="_blank">' +
      '<img src="' + tableData[i].logoUrl + '" class="img-rounded">' +
      '<label>&nbsp;&nbsp;' + tableData[i].label + '</label>' +
      '</a>' +
      '</td></tr>';
  }
  document.getElementById("my_links").innerHTML = draw;
}
