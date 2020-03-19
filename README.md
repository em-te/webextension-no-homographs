# WebExtension: No Homo Graphs

## Introduction
No Homo Graph checks in real-time to see if websites you visit are spelled similar to a user-defined list of domains. If similar matches (a.k.a. homo-graphs) are found, a modal dialog is shown preventing you from interacting with the website until you indicate awareness of the risks involved. The modal dialog is modal to the website only and doesn't prevent you from switching tabs or replacing it with another website altogether. The user-defined list of domains is populated with popular domains like PayPal, Western Union, Google, Yahoo, MyEtherWallet and MoneyGram and the user is free to add and remove from the list.

## How it works
When you visit a website, this add-on parses the second-level and third-level domain from the URL and calculates the difference between them and the domains in your user-defined list. If the domains contain Cyrillic characters that look like Ascii characters, they will be converted into Ascii. If the difference is below a threshold (2 permutations if the domain is less than 7 characters excluding the TLD), it will alert the user that a match was found.

### Example attacks:
- https://xn--80aa0cbo65f.com (fake paypal.com)
- https://www.xn--80ak6aa92e.com (fake apple.com)
- http://www.xn--o1aae.com (fake cnn.com)

## Further reading:
- https://slashdot.org/story/02/05/28/0142248/spoofing-urls-with-unicode
- https://dev.to/loganmeetsworld/homographs-attack--5a1p

