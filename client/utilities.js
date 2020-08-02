const setCookie = function(name, val, exp_days) {
    var d = new Date();
    d.setTime(d.getTime() + (exp_days * 24 * 60 * 60 * 1000));
    document.cookie = name + "=" + val + ";expires=" + d.toGMTString() + ";SameSite=Strict;path=/";
};

const getCookie = function(name) {
    name = name + "=";
    var ca = decodeURIComponent(document.cookie).split(";");
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ')
            c = c.substring(1);
        if (c.indexOf(name) == 0)
            return c.substring(name.length);
    }
    return "";
};

const copyLink = function() {
    var copyText = document.getElementById("copylink");
    copyText.select();
    copyText.setSelectionRange(0, 99999)
    document.execCommand("copy");
}