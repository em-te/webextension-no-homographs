"use strict";

let $ = id => document.getElementById(id);

function init() {
  document.title = chrome.i18n.getMessage("browserActionTitle");
  let list = document.querySelectorAll("*[i18n]");
  for(let n of list) {
    n.textContent = chrome.i18n.getMessage(n.textContent);
  }

  let proList = $("proList");
  let whiteList = $("whiteList");
  let saveBtn = $("save");
  
  chrome.storage.local.get(null, obj => {
    if("proDomains" in obj) proList.value = obj.proDomains;
    if("whiteDomains" in obj) whiteList.value = obj.whiteDomains;
  });

  saveBtn.onclick = () => {
    let doms1 = proList.value.split(/[\n\r]+/);
    let doms2 = whiteList.value.split(/[\n\r]+/);
    doms1 = doms1.map(s => cleanUrl(s)).sort();
    doms2 = doms2.map(s => cleanUrl(s)).sort();
    while(doms1.length && !doms1[0]) doms1.shift();
    while(doms2.length && !doms2[0]) doms2.shift();
    doms1 = doms1.join("\n");
    doms2 = doms2.join("\n");
    chrome.storage.local.set({
      proDomains: doms1,
      whiteDomains: doms2
    });
    proList.value = doms1;
    whiteList.value = doms2;
    saveBtn.disabled = true;
  };

  proList.onfocus = whiteList.onfocus = () => {
    saveBtn.disabled = false;
  };
}

init();

function cleanUrl(url) {
  let i = url.indexOf("://");
  if(i >= 0) url = url.substr(i + 3);
  i = url.indexOf("/");
  if(i > 0) url = url.substr(0, i);
  i = url.indexOf(":");
  if(i > 0 && i === url.lastIndexOf(":")) url = url.substr(0, i);
  if(url.normalize) url = url.normalize();  //reduce the number of code points
  url = punycode.toUnicode(url);  //convert any "xn--" bits to unicode
  return url;
}