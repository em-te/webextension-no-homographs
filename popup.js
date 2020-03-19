"use strict";

var $ = id => document.getElementById(id);

var ctxTabId;

function init() {
  let list = document.querySelectorAll("*[i18n]");
  for(let n of list) {
    n.textContent = chrome.i18n.getMessage(n.textContent);
  }

  $("exit").onclick = () => {window.close()};

  chrome.tabs.query({currentWindow: true, active: true}, tabs => {
    let tab = tabs[0];
    if(tab) ctxTabId = tab.id;

    chrome.runtime.sendMessage({checkUrl: tab.url}, res => {
      if(res) {
        $("thisUrl").textContent = res.domain;
        $("thisUrl2").textContent = res.domain;
        $("thatUrl").textContent = res.bestDomain;

        $("addurl").onclick = () => {
          chrome.runtime.sendMessage({allowDomain: res.domain}, () => {
            showSettings();
          });
        };
      }
    });
  });

  $("viewlist").onclick = () => {showSettings()};
}

init();

function showSettings() {
  chrome.tabs.create({
    openerTabId: ctxTabId,
    url: chrome.extension.getURL("settings.html")
  });
}