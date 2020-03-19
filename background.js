"use strict";
/* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and 
associated documentation files (the "Software"), to deal in the Software without restriction, including 
without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or 
sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject 
to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial 
portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT 
LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN 
NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE 
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var protectedDomains = {
  //"10": {"paypal.com": null || [p,a,y,p,a,l,.,c,o,m]}  //domain names mapped by its string length
};
var whitelistDomains = {};

updateSettings({
  proDomains: "google.com\npaypal.com\nmyetherwallet.com\nwesternunion.com\nsecure.moneygram.com\nyahoo.com"
});

//promptMsg = Be careful: | domain.tld | -or- | domain2.tld | Type anything to continue.
const promptMsg = ["promptMsg1", "promptMsg2", "promptMsg3"].map(s => chrome.i18n.getMessage(s));

const cyrilAlpha = {
  "593": "a",  //IPA replaced chars
  "595": "b",
  "600": "e",
  "601": "e",
  "609": "g",
  "614": "h",
  "616": "i",
  "617": "i",
  "619": "l",
  "625": "m",
  "627": "n",
  "636": "r",
  "638": "r",
  "648": "t",
  "656": "z",
  "663": "c",
  "675": "dz",
  "678": "ts",
  "682": "ls",
  "683": "lz",

  "1072": "a",  //cyril replaced chars
  "1089": "c",
  "1281": "d",
  "1077": "e",
  "1211": "h",
  "1110": "i",
  "1112": "j",
  "1231": "l",
  "1087": "n",
  "1086": "o",
  "1141": "o",
  "1144": "oy",
  "1088": "p",
  "1109": "s",
  "1141": "v",
  "1121": "w",
  "1093": "x",
  "1091": "y",
  "1199": "y"
};
for(let i in cyrilAlpha) {
  cyrilAlpha[String.fromCharCode(i)] = cyrilAlpha[i];
  delete cyrilAlpha[i];
}

chrome.webNavigation.onDOMContentLoaded.addListener(
  ({tabId, url, frameId}) => {
    if(frameId > 0) return;

    let domains = urlToBaseDomains(url);  //returns variations of domain [tld.country, domain.tld.country]
    if(!domains) return;  //urls without "://" e.g. about:blank

    for(let dom of domains) {
      if(!dom || dom in whitelistDomains) return;  //skip if in whitelist

      let group = protectedDomains[dom.length + ""];
      if(group && dom in group) return;  //skip if exact match to protected domain
    }

    let obj = checkBestScore(domains);

    if(obj && obj.bestScore > 0 && obj.bestScore <= obj.deviation) {
      chrome.tabs.executeScript(tabId, {
        code: makeCode(obj.domain, obj.bestDomain),
        allFrames: false,
        runAt: "document_end"
      });

      chrome.pageAction.show(tabId);
    }
  }
);

function makeCode(domain, bestDomain) {
  return "while(!prompt('" + promptMsg[0] + "\\n\\n" + domain.toUpperCase() +
    "\\n" + promptMsg[1] + "\\n" + bestDomain.toUpperCase() + "\\n\\n" + promptMsg[2] + "',''));" +
    "chrome.runtime.sendMessage({allowDomain:'" + domain + "'});";
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if(sender.id !== chrome.runtime.id) return;

  if(msg.allowDomain) {  //called by webpage
    whitelistDomains[msg.allowDomain] = true;
    saveWhitelist();

  } else if(msg.checkUrl) {  //called by toolbar popup
    let doms = urlToBaseDomains(msg.checkUrl);
    reply(doms && checkBestScore(doms));
  }
});

function checkBestScore(domains) {
  let obj;
  for(let i = 0; i < domains.length; i++) {
    obj = checkScore(domains[i]);

    if(obj && obj.bestScore > obj.deviation) {  //check again with replaceable characters
      let changed = false;
      let arr = Array.from(domains[i]);  //better than split("") as compatible with surrogate pairs
      for(let i = 0; i < arr.length; i++) {
        let c = cyrilAlpha[arr[i]];
        if(c) {
          arr[i] = c;
          changed = true;
        }
      }
      if(changed) {
        obj = checkScore(arr.join(""));
        if(obj) {
          obj.domain = domains[i];  //change it back to the pre-replace domain
          //a perfect match after replacing characters still deserves an alert
          if(obj.bestScore === 0) obj.bestScore = 1;
        }
      }
    }

    if(obj && obj.bestScore <= obj.deviation) return obj;
  }
  return obj;
}

function checkScore(domain) {
  let length;
  if(/\.\d+$/.test(domain)) {  //domain is ipv4 address
    length = domain.length;
  } else {
    length = domain.lastIndexOf(".");  //exclude TLD
    if(length < 0) length = domain.length;  //either domain is ipv6 or mapped hostname
  }

  if(length === 1) return;  //no deviation allowed www.t.co

  let deviation = 
    length <= 3 ? 1 : //hp.com
    length <= 6 ? 2 : //paypai.com
    3; //deviation <= 8 ? 3 : //facabook.com

  let domainArr = decodeUTF16(domain);

  let bestScore = 100;  //arbitrary large number
  let bestDomain;

  //allow word length to deviate within a range
  for(let i = Math.max(domainArr.length - deviation, 0), len = domainArr.length + deviation; i < len; i++) {
    let doms = protectedDomains[i + ""];
    if(doms) {
      for(let dom in doms) {
        let domArr = doms[dom];
        if(!domArr) {  //store the array for future comparison optimization
          domArr = doms[dom] = decodeUTF16(dom);
        }
        let d = levenshtein(domArr, domainArr);
        if(d < bestScore) {
          bestScore = d;
          bestDomain = dom;
        }
      }
    }
  }

  return {domain, bestScore, bestDomain, deviation};
}

function saveWhitelist() {
  chrome.storage.local.set({
    whiteDomains: Object.keys(whitelistDomains).join("\n")
  });
}

function updateSettings(obj) {
  if("proDomains" in obj) {
    protectedDomains = {};
    let doms = obj.proDomains.split("\n");
    for(let dom of doms) {
      if(dom) {
        let len = dom.length + "";

        let item = protectedDomains[len];
        if(!item) {
          item = protectedDomains[len] = {};
        }

        item[dom] = null;
      }
    }
  }
  if("whiteDomains" in obj) {
    whitelistDomains = {};
    let doms = obj.whiteDomains.split("\n");
    for(let dom of doms) {
      if(dom) whitelistDomains[dom] = true;
    }
  }
}

chrome.storage.local.get(null, updateSettings);

chrome.storage.onChanged.addListener(obj => {
  let newObj = {};
  for(let name in obj) newObj[name] = obj[name].newValue;
  updateSettings(newObj);
});


function urlToBaseDomains(url) {
  let pos = url.indexOf("://");
  if(pos < 0) return;

  let domain = url.substring(pos + 3, url.indexOf("/", pos + 3));

  if(domain.substr(0, 4) === "www.") domain = domain.substr(4);

  pos = domain.indexOf(":");  //remove port
  if(pos > 0 && pos === domain.lastIndexOf(":")) {  //if more than 2 then is ipv6 address
    domain = domain.substr(0, pos);
  }

  domain = punycode.toUnicode(domain);

  pos = domain.lastIndexOf(".");
  if(pos > 0 && !/\d/.test(domain.charAt(pos + 1))) {  //if first char of TLD is digit then assume is IP address
    //example: pop.mail.yahoo.co.uk
    pos = domain.lastIndexOf(".", pos - 1);
    if(pos > 0) {
      let tld = domain.substr(pos + 1);  //co.uk

      pos = domain.lastIndexOf(".", pos - 1);
      if(pos > 0) {
        domain = [tld, domain.substr(pos + 1)];  //[co.uk, yahoo.co.uk]
      } else {
        domain = [tld, domain];  //[co.uk, yahoo.co.uk]
      }
    } else {
      domain = [domain];  //[co.uk]
    }
  } else domain = [domain];  //IPv4 address

  return domain;  //IPv6 address or mapped hostname (e.g. localhost)
}

//Copyright (c) 2011 Andrei Mackenzie from (https://gist.github.com/andrei-m/982927)
//with modification by kigiri (https://gist.github.com/kigiri) on Nov 26, 2016

function levenshtein(a, b) {
  if(a.length === 0) return b.length;
  if(b.length === 0) return a.length;

  //swap to save some memory O(min(a,b)) instead of O(a)
  if(a.length > b.length) {
    let tmp = a;
    a = b;
    b = tmp;
  }

  const aLen = a.length;
  let row = new Array(aLen + 1);
  for(let i = 0; i <= aLen; i++) {
    row[i] = i;
  }

  for(let i = 1; i <= b.length; i++) {
    let prev = i;
    for(let j = 1; j <= aLen; j++) {
      let val;
      if(b[i-1] === a[j-1]) {  //match
        val = row[j-1];
      } else {
        val = Math.min(
          row[j - 1] + 1, /*subst*/
          Math.min(prev + 1/*insert*/, row[j] + 1 /*dele*/)
        );
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[aLen] = prev;
  }
  return row[aLen];
}