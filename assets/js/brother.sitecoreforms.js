if ($===undefined && jQuery!==undefined){
	$ = jQuery;
}

$('document').ready(function () {
    
    var returner;

    const urlSearchParams = new URLSearchParams(window.location.search);


    function enableSubmit(xpForm) {
        $(xpForm).find('.btn-default').prop('disabled', false);
    }
    function disableSubmit(thisBlock) {
        $(thisBlock).find('.btn-default').prop('disabled', true);
    }
    function isEmail1(email) {
        //var regex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,17}$/i;
        var regex = /^[a-zA-Z][\w\+.-]*[a-zA-Z0-9]@[a-zA-Z0-9][\w\.-]*\.[a-zA-Z][a-zA-Z\.]*[a-zA-Z]$/i;
        return regex.test(email);
    }

    function isPhone(phone) {
        var regex = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/g;
        return regex.test(phone);
    }

    function isZipCode(zipCode) {
        var regex = /^[0-9]{5}$|^[a-zA-Z][0-9][a-zA-Z] ?[0-9][a-zA-Z][0-9]$|^[0-9]{5}(?:-[0-9]{4})?$/g;
        return regex.test(zipCode);
    }

    function isDate(date) {
        var regex = /^(((0)[0-9])|((1)[0-2]))(\/)([0-2][0-9]|(3)[0-1])(\/)\d{4}$/i;
        return regex.test(date);
    }

    function EmailValidation3(thisBlock) {
        $(thisBlock).find('.email-input').each(function () {
            var email = $(this);
            var emailErrorMessage = "";
            if (email.val() == "") {
                emailErrorMessage = $(this).attr("data-val-required");
            }
            else {
                emailErrorMessage = $(this).attr("data-val-regex");
            }

            if (!isEmail1(email.val())) {
                window.utag.link({
                    'tealium_event': 'error message',
                    'error_message': emailErrorMessage
                });
                returner = false;
            }
        });
    }

    function phoneValidation(thisBlock) {
        $(thisBlock).find('.phone-number-input').each(function () {          
            var phone = $(this);
            var phoneErrorMessage = "";
            if (phone.val() == "") {
                phoneErrorMessage = $(this).attr("data-val-required");
            }
            else {
                phoneErrorMessage = $(this).attr("data-val-regex");
            }

            if (!isPhone(phone.val())) {
                window.utag.link({
                    'tealium_event': 'error message',
                    'error_message': phoneErrorMessage
                });
                returner = false;
            }
        });
    }

    function zipCodeValidation(thisBlock) {

        $(thisBlock).find('.zipCodeField .single-line-text').each(function () {
            var zip = $(this);
            var zipcodeErrorMessage = "";
            if (zip.val() == "") {
                zipcodeErrorMessage = $(this).attr("data-val-required");
            }
            else {
                zipcodeErrorMessage = $(this).attr("data-val-regex");
            }

            
            if (!isZipCode(zip.val())) {
               if (zip.val() != null && zip.val() != undefined && zip.val() != '') { 
                        window.utag.link({
                            'tealium_event': 'error message',
                            'error_message': zipcodeErrorMessage
                        });
                }
                    returner = false;
            }
            
        });
    }

    function dateValidation(thisBlock) {

        $(thisBlock).find('input[type="date"]').each(function () {
            var date = $(this);
            var dateErrorMessage = "";
            if (date.val() == "") {
                dateErrorMessage = $(this).attr("data-val-required");
            }
            else {
                dateErrorMessage = $(this).attr("data-val-date");
            }

            
            if (!isDate(date.val())) {

                if (date.val() != null && date.val() != undefined && date.val() != '') {
                        window.utag.link({
                            'tealium_event': 'error message',
                            'error_message': dateErrorMessage
                        });
                }
                    returner = false;
            }
            
        });
    }

    function dropDownValidation(thisBlock) {
        $(thisBlock).find('select').each(function () {
            var dropdownErrorMessage = $(this).attr('data-val-required');
            var selectedOptionIndex = $(this)[0].selectedIndex;
            if (selectedOptionIndex == 0) {
                returner = false;
                window.utag.link({
                    'tealium_event': 'error message',
                    'error_message': dropdownErrorMessage
                });
            } else {
            }
        });
    }

    $(document).on('click', '.brother-form input[type="submit"]', function (e) {

        returner = true;
        var thisBlock = $(this).closest('.brother-form');

        $(thisBlock).find('.form-group.required-field .single-line-text').each(function () {
            var value = $(this).val();
            if (!value) {
                var errorMessage = $(this).attr("data-val-required");
                window.utag.link({
                    'tealium_event': 'error message',
                    'error_message': errorMessage
                });
                returner = false;
            } else {

            }

        });

        dropDownValidation(thisBlock);

        EmailValidation3(thisBlock);

        phoneValidation(thisBlock);
        zipCodeValidation(thisBlock);
        dateValidation(thisBlock);

        $(thisBlock).find('textarea[data-val-required]').each(function () {
            let value = $(this).val();
            if (value == '') {

                returner = false;
            }
        })
        if ($("div[id$='CaptchaValue_wrapper']").length > 0 && grecaptcha.getResponse() == '') {
            window.utag.link({
                'tealium_event': 'error message',
                'error_message': 'Please confirm you are not a robot.'
            });
            returner = false;
        }
        var formName_local = $(this).closest('.brother-form-wrapper').attr('data-formname');
        if (formName_local == undefined || formName_local == null || formName_local == 'Untitled Form') {
            formName_local = window.location.pathname;
        }
        var formInitiateCount = $(this).closest('.brother-form-wrapper').attr('tealiumforminitiate');

        if (formInitiateCount == 0) {
            window.utag.link({
                'tealium_event': 'form initiate',
                'form_name': formName_local
            });

            $(this).closest('.brother-form-wrapper').attr('tealiumforminitiate', '1');
        }


        $('.tealiumClass').each(function () {
            $(this).blur();
        });

        $('.tealiumClassDropdown').each(function () {
            $(this).blur();
        });

        //focus on the first input field having error
        let firstErrorField = $(".field-validation-error").filter(":first");
        let errorInputField = (firstErrorField != undefined && firstErrorField.length > 0) ? firstErrorField.siblings(".form-control") : "";
        if (errorInputField != "") {
            errorInputField.focusin();
        }


        if (returner == false) {
            //e.preventDefault();
        }
        else {
                let formName = $(this).closest('.brother-form-wrapper').attr('data-formname');
                window.utag.link({
                    'tealium_event': 'form submit',
                    'form_name': formName_local
                });

                localStorage['submittedForm'] = $(this).closest('form').attr('id');

            if (formName === "GM_BrotherUSA_ContactUs_072121" || formName === "GM_IPM_BrotherUSA_ContactUs" || formName === "GM_AMR_BrotherUSA_ContactUs" || formName === "GM_5yr_BrotherUSA_ContactUs" || formName=== "GM_Cannabis_BrotherUSA_ContactUs") {
                    window.utag.link({
                        'event_name': 'Lead Form Submission',
                        'lead_type': 'Gear Motors',
                        'form_name': formName_local
                    });
            } else if (formName === "B2_Refresh_Form") {
                    window.utag.link({
                        'event_name': 'Lead Form Submission',
                        'lead_type': 'VSP',
                        'form_name': formName_local
                    });
            } else if (formName === "BMG_BrotherUSA_ContactARep_NEW" || formName === "BrotherUSA_BIZSolutions_HWNW_Main" || formName === "BrotherUSA_BIZSolutions_KOFAX" || formName === "BMG_BrotherUSA_Contact-Form_PDP_Pages" || formName === "BrotherUSA_BIZSolutions_Managed Print Services_NEW" || formName === "BMG_BrotherUSA_TAAContactForm" || formName === "BrotherUSA_BIZSolutions_HWNW_Government" || formName === "BMG_BrotherUSA_ContactARep_NEW" || formName === "BrotherUSA_BIZSolutions_HWNW_Education" || formName === "BrotherUSA_BIZSolutions_HWNW_Healthcare" || formName ==="BrotherUSA_BIZSolutions_HWNW_Retail") {
                    window.utag.link({
                        'event_name': 'Lead Form Submission',
                        'lead_type': 'SMB',
                        'form_name': formName_local
                    });
                }


            }
    });

    $('.brother-form').each(function () {
        var formName = $(this).attr('data-formname');
        var referrer = window.location.href.split('?')[0];

        $(this).find("[data-sc-field-name='hiddenField_sourceURL']").each(function () {
            $(this).val(referrer);
        });

        if (urlSearchParams.get("utm_source")) {
            $(this).find("[data-sc-field-name='utm_source'],[data-sc-field-name='hiddenUTM_source']").val(urlSearchParams.get("utm_source"));
        }
        if (urlSearchParams.get("utm_medium")) {
            $(this).find("[data-sc-field-name='utm_medium'],[data-sc-field-name='hiddenUTM_medium']").val(urlSearchParams.get("utm_medium"));
        }
        if (urlSearchParams.get("utm_campaign")) {
            $(this).find("[data-sc-field-name='utm_campaign'],[data-sc-field-name='hiddenUTM_campaign']").val(urlSearchParams.get("utm_campaign"));
        }
        if (urlSearchParams.get("utm_content")) {
            $(this).find("[data-sc-field-name='utm_content'],[data-sc-field-name='hiddenUTM_content']").val(urlSearchParams.get("utm_content"));
        }
        if (urlSearchParams.get("utm_term")) {
            $(this).find("[data-sc-field-name='utm_term'],[data-sc-field-name='hiddenUTM_term']").val(urlSearchParams.get("utm_term"));
        }

        //Sitecore Forms tealium form tracking
        $('.tealiumClass').blur(function () {
            var formName_local = $(this).closest('.brother-form-wrapper').attr('data-formname');
            if (formName_local == undefined || formName_local == null || formName_local == 'Untitled Form') {
                formName_local = window.location.pathname;
            }
            var formInitiateCount = $(this).closest('.brother-form-wrapper').attr('tealiumforminitiate');
            var count = $(this).attr('tealiumtrackingcount');
            var fieldName = $(this).attr('data-sc-field-name');
            var hiddenStatus = $(this).hasClass('hiddenfield');
            var $this = $(this);

            if (formInitiateCount == 0) {
                window.utag.link({
                    'tealium_event': 'form initiate',
                    'form_name': formName_local,
                    'field_name': fieldName
                });

                $(this).closest('.brother-form-wrapper').attr('tealiumforminitiate', '1');
            }

            if ((count == 0 && formInitiateCount == 0) && ($(this).val() == null || $(this).val() == undefined || $(this).val() == '')) {
                setTimeout(function () {
                    window.utag.link({
                        'tealium_event': 'form fallout',
                        'form_name': formName_local,
                        'field_name': fieldName
                    });

                    $this.attr('tealiumtrackingcount', '1');
                }, 1000);
            } else if (count == 0 && ($(this).val() == null || $(this).val() == undefined || $(this).val() == '') && !hiddenStatus) {
                    window.utag.link({
                        'tealium_event': 'form fallout',
                        'form_name': formName_local,
                        'field_name': fieldName
                    });
                    $(this).attr('tealiumtrackingcount', '1');
                } 
        });

        $('.tealiumClassDropdown').blur(function () {

            var formName_local = $(this).closest('.brother-form-wrapper').attr('data-formname');
            if (formName_local == undefined || formName_local == null || formName_local == 'Untitled Form') {
                formName_local = window.location.pathname;
            }
            var formInitiateCount = $(this).closest('.brother-form-wrapper').attr('tealiumforminitiate');
            var count = $(this).attr('tealiumtrackingcount');
            var fieldName = $(this).attr('data-sc-field-name');
            var $this = $(this);

            var selectedOptionIndex = $(this)[0].selectedIndex;

            if (formInitiateCount == 0) {
                window.utag.link({
                    'tealium_event': 'form initiate',
                    'form_name': formName_local,
                    'field_name': fieldName
                });

                $(this).closest('.brother-form-wrapper').attr('tealiumforminitiate', '1');
            }

            if ((count == 0 && formInitiateCount == 0) && selectedOptionIndex == 0) {
                setTimeout(function () {
                    window.utag.link({
                        'tealium_event': 'form fallout',
                        'form_name': formName_local,
                        'field_name': fieldName
                    });

                    $this.attr('tealiumtrackingcount', '1');
                }, 1000);
            }
            else if (count == 0 && selectedOptionIndex == 0) {
                    window.utag.link({
                        'tealium_event': 'form fallout',
                        'form_name': formName_local,
                        'field_name': fieldName
                    });
                    $(this).attr('tealiumtrackingcount', '1');
                } 
        });
        $('.tealiumClassCheckbox').change(function () {

            var formName_local = $(this).closest('.brother-form-wrapper').attr('data-formname');
            if (formName_local == undefined || formName_local == null || formName_local == 'Untitled Form') {
                formName_local = window.location.pathname;
            }
            var formInitiateCount = $(this).closest('.brother-form-wrapper').attr('tealiumforminitiate');
            var count = $(this).attr('tealiumtrackingcount');
            var fieldName = $(this).attr('data-sc-field-name');
            var $this = $(this);
            var status = $(this).is(':checked');
            var statusText;

            if (status == true) {
                statusText = 'checked';
            } else {
                statusText = 'unchecked';
            }

            if (status == true) {
                if (formInitiateCount == 0) {

                    window.utag.link({
                        'tealium_event': 'form initiate',
                        'form_name': formName_local,
                        'field_name': fieldName
                    });

                    $(this).closest('.brother-form-wrapper').attr('tealiumforminitiate', '1');


                        window.utag.link({
                            'tealium_event': 'checkbox status',
                            'checkbox_status': statusText,
                            'field_name': fieldName
                        });

                        $this.attr('tealiumtrackingcount', '1');
                    
                } else {
                    window.utag.link({
                        'tealium_event': 'checkbox status',
                        'checkbox_status': statusText,
                        'field_name': fieldName
                    });
                    $(this).attr('tealiumtrackingcount', '1');
                }
            } else {
                window.utag.link({
                    'tealium_event': 'checkbox status',
                    'checkbox_status': statusText,
                    'field_name': fieldName
                });
                $(this).attr('tealiumtrackingcount', '1');
            }           
        });

    });

    
    //TODO: Move this to another file? Doesn't seem to be related to Sitecore Forms. (This was left over from the old WFFM js file.)
    $('.tealium-MVC-Field').each(function () {
        $(this).focusout(function () {
            var formName_local = $(this).closest('.tealium-MVC-Form').attr('data-formName');
            if (formName_local == undefined || formName_local == null || formName_local == 'Untitled Form') {
                formName_local = window.location.pathname;
            }
            var formInitiateCount = $(this).closest('.tealium-MVC-Form').attr('tealiumforminitiate');
            var count = $(this).attr('tealiumtrackingcount');
            var fieldName = $(this).attr('data-fieldName').replace(/\s/g, '');
            var $this = $(this);
            if (formInitiateCount == 0) {
                window.utag.link({
                    'tealium_event': 'form initiate',
                    'form_name': formName_local,
                    'field_name': fieldName
                });
                $(this).closest('.tealium-MVC-Form').attr('tealiumforminitiate', '1');
            }
            if (count == 0 && formInitiateCount == 0) {
                setTimeout(function () {
                    console.log('tealium form fallout tracking during initiate');
                    window.utag.link({
                        'tealium_event': 'form fallout',
                        'form_name': formName_local,
                        'field_name': fieldName
                    });
                    $this.attr('tealiumtrackingcount', '1');
                }, 1000);
            } else
                if (count == 0 || count === undefined) {
                    window.utag.link({
                        'tealium_event': 'form fallout',
                        'form_name': formName_local,
                        'field_name': fieldName
                    });
                    $(this).attr('tealiumtrackingcount', '1');
                } 
        })
    });

});