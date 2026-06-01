$(document).ready(function () {
    // const menuHandle = $('.auth .auth-menu-wrap .auth-menu-block li.auth-has-dropdown');
    const menuHandle = $('.auth .auth-handle');
    const overlayDiv = $("<div />");
    overlayDiv.addClass("b-overlay");
    $('.global-main').append(overlayDiv);
    menuHandle.click(function () {
        let checkClass = $(this).hasClass("auth-open");
        if (checkClass) {
            $(this).removeClass("auth-open");
            $('.auth-sub-menu').removeClass('open');
            $('.auth-arrow1').addClass('down');
            $('.auth-arrow1').removeClass('up');
            $('.header-container.header-eq-height').removeClass('no-fixed');
            $('.global-main').removeClass('has-oerlay');
            $('.b-overlay').removeClass('show');
        }
        else {
            $(this).addClass("auth-open");
            $('.global-main').addClass('has-oerlay');
            $('.auth-sub-menu').addClass('open');
            $('.auth-arrow1').addClass('up');
            $('.auth-arrow1').removeClass('down');
            $('.header-container.header-eq-height').addClass('no-fixed');
            $('.b-overlay').addClass('show');

        }
    });
    $('.auth-sub-menu .auth-close-icon').click(function (e) {
        e.preventDefault();
        menuHandle.removeClass('auth-open');
        $('.auth-sub-menu').removeClass('open');
        $('.auth-arrow1').addClass('down');
        $('.auth-arrow1').removeClass('up');
        $('.header-container.header-eq-height').removeClass('no-fixed');
        $('.global-main').removeClass('has-oerlay');
        $('.b-overlay').removeClass('show');
    });
    $(document).click(function (e) {
        // const handle = $(e.target).parents('.auth-has-dropdown');
        // console.log(e.target);
        const handle = $(e.target).parents('.auth .auth-handle');
        if (handle.length == 1) {
            return;
        }
        const parent = $(e.target).parents('.auth-sub-menu');
        if (parent.length == 1) {
            e.stopPropagation();
            return;
        }
        else {
            if (menuHandle.hasClass('auth-open')) {
                menuHandle.removeClass('auth-open');
                $('.auth-sub-menu').removeClass('open');
                $('.auth-arrow1').addClass('down');
                $('.auth-arrow1').removeClass('up');
                $('.auth-myaccount-sub-section').addClass('hidden');
                $('.header-container.header-eq-height').removeClass('no-fixed');
                $('.global-main').removeClass('has-oerlay');
                $('.b-overlay').removeClass('show');
            }
        }
    });

    $('.auth-myaccount-section').click(function (e) {
        const check = $(this).hasClass('open');
        if (check) {
            $(this).removeClass('open');
            $('.auth-myaccount-sub-section').addClass('hidden');
            $('.auth-arrow').addClass('down');
            $('.auth-arrow').removeClass('up');
        }
        else {
            $(this).addClass('open');
            $('.auth-myaccount-sub-section').removeClass('hidden');
            $('.auth-arrow').addClass('up');
            $('.auth-arrow').removeClass('down');
        }
    });
});