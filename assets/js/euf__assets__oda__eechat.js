
var eeScriptLoad = true; //Variable set to true which is used as trigger for other rules. This variable set indicates script has been loaded
 
/* Hide element by class name*/
function hideElementByClassName(className){
    var divsToHide = document.getElementsByClassName(className); 
    for(var i = 0; i < divsToHide.length; i++){
        divsToHide[i].style.display = "none";
    }
}

/* Remove Element by  ID*/
function removeElementByID (elementName)
{
    var myobj = document.getElementById(elementName);
    if(myobj)
    {
    myobj.remove();
    }

}

/* Remove Element by Class*/
function removeElementsByClass(className) 
{
    let elements = document.getElementsByClassName(className);
    while(elements.length > 0) {
        elements[0].parentNode.removeChild(elements[0]);
    }
}

/* Hide Specific Column by nth-child */
function hideSpecificColumn() {
    const element = document.querySelector('.row > .col-md-4:nth-child(2)');
    if (element) {
        element.style.display = 'none';
    }
}

/* Hide First Occurrence of a Specific Class Inside a Parent */
function hideFirstSupportWidget() {
    const firstWidget = document.querySelector('.janus-pdp-widgets-block > .janus-pdp-widget-col.janus-pdp-suppor-widget');
    if (firstWidget) {
        firstWidget.style.display = 'none';
    }
}

/* Hide Nested Occurrence of a Specific Class */
function hideNestedSupportWidget() {
    const nestedWidget = document.querySelector(
        '.modal-content > .modal-body.padding-0 > .janus-pdp-widgets-block > .janus-pdp-widget-col.janus-pdp-suppor-widget'
    );
    if (nestedWidget) {
        nestedWidget.style.display = 'none';
    }
}

/*Hide paragraph based on content*/
function hideParagraphByContent(content) {
  const paragraphs = document.querySelectorAll('p');

  paragraphs.forEach(paragraph => {
    if (paragraph.textContent.includes(content)) {
      paragraph.style.display = 'none';
    }
  });
}

/** Show the ID element**/
function showElementByID(elementName)
{
var myobj = document.getElementById(elementName);
if(myobj)
{
myobj.style.display = "block";
}
}
/** Show the class element**/
function showElementByClassName(className)
{
var divsToHide = document.getElementsByClassName(className);
for(var i = 0; i < divsToHide.length; i++)
{
divsToHide[i].style.display = "block";
}
}

// Capture Product from PSP URL
function getLastURLSegment() {
  const url = window.location.href;
  const urlParts = url.split('/');
  const lastSegment = urlParts.pop();
  
  // Remove any query parameters or hash fragments
  return lastSegment.split(/[?#]/)[0];
}

var styles = `#inlay-oracle-chat-embedded{max-height: calc(100% - 150px); z-index: 4000000001;}`;
 
var styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet) ;

/** ODA Live Agent Handoff code below **/
/** New variables needs to declared on top **/
var product_sku;
var formSet = false;
/** Function to launch form in contact Us page **/
function launchFormFieldsContactUs(inOrOut)
{
    const currentUrl = window.location.href;
if(!formSet)
{
formSet = true;
if(inOrOut=="in")
{
formdata = "[{\"hidden\": true, \"name\": \"c$description_of_issue\", \"required\": true ,\"value\":\""+ currentUrl+"\"},{\"hidden\": true, \"name\": \"SUBJECT\", \"required\": true ,\"value\":\"hello\"},{\"hidden\": true, \"name\": \"c$chat_hours\", \"required\": true ,\"value\":\"in\"},{\"hidden\": true, \"name\": \"c$oda_product_name\", \"required\": true ,\"value\":\""+ product_sku+"\"}]";
}
else
{
formdata = "[{\"hidden\": true, \"name\": \"c$description_of_issue\", \"required\": true ,\"value\":\""+ currentUrl+"\"},{\"hidden\": true, \"name\": \"SUBJECT\", \"required\": true ,\"value\":\"hello\"},{\"hidden\": true, \"name\": \"c$chat_hours\", \"required\": true ,\"value\":\"out\"},{\"hidden\": true, \"name\": \"c$oda_product_name\", \"required\": true ,\"value\":\""+ product_sku+"\"}]";;
}
}
}
/** This is the function called when in product and support page**/
function launchFormFields(inOrOut)
{
if(utag_data.product_sku || utag_data.page_category)
{
if(utag_data.product_sku!="" && utag_data.product_sku!="*" && utag_data.product_sku!=null && utag_data.
product_sku!="undefined")
{
product_sku = utag_data.product_sku;
}
if(utag_data.page_category!="" && utag_data.page_category!="*" && utag_data.page_category!= null &&
utag_data.page_category!="undefined")
{
product_sku = utag_data.page_category;
}
if(!formSet)
{
formSet = true;
if(inOrOut=="in")
{
formdata = "[{\"hidden\": true, \"name\": \"SUBJECT\", \"required\": true ,\"value\":\"hello\"},{\"hidden\": true, \"name\": \"c$chat_hours\", \"required\": true ,\"value\":\"in\"},{\"hidden\": true, \"name\": \"c$oda_product_name\", \"required\": true ,\"value\":\""+ product_sku+"\"}]";
}
else
{
formdata = "[{\"hidden\": true, \"name\": \"SUBJECT\", \"required\": true ,\"value\":\"hello\"},{\"hidden\": true, \"name\": \"c$chat_hours\", \"required\": true ,\"value\":\"out\"},{\"hidden\": true, \"name\": \"c$oda_product_name\", \"required\": true ,\"value\":\""+ product_sku+"\"}]";;
}
}
}
}

var productname;

const checker = setInterval(() => {
  if (utag_data.item_name !== undefined && utag_data.item_name !== null && utag_data.item_name !== "") {
    console.log("Value found:", utag_data.item_name);
    productname = utag_data.item_name
    clearInterval(checker); // stop checking once value is found
  } else {
    console.log("Still waiting...");
  }
}, 200);