$(document).ready(function () {
    matchHeight.init();
    matchHeight2.init();
    $('.crousel-pause').click(function () {
        $(this).parents('.slide').carousel('pause');
        $(this).css('display', 'none');
        $(this).parents('.slide').find('.crousel-play').css('display', 'block');
    });
    $('.crousel-play').click(function () {
        $(this).parents('.slide').carousel('cycle');
        $(this).css('display', 'none');
        $(this).parents('.slide').find('.crousel-pause').css('display', 'block');
    });
    $('.newtabcontent').each(function (i, obj) {
        if (!$.trim($(this).html()).length) {
            $("#" + $(this).attr("data-tab-id")).hide();
            $("#" + $(this).attr("data-content-id")).hide();
        }
    });
    if ($(window).width() < 767) {
        $(document).on("scroll", onScroll);
        tabheight = 0;
        $('.main-tab-component ul.nav li').each(function () {
            tabheight += $(this).outerHeight();
        })
        $('#tabs').css('height', tabheight);
        $(document).on('click', '#tabs:not(".tabs1") a[href^="#"]', function (e) {
            $('html, body').stop().animate({
                'scrollTop': $(".main-tab-component").position().top + 5
            }, 500, 'swing', function () {

            });
        });
        $(document).on('click', '.tabs1 a[href^="#"]', function (e) {
            e.preventDefault();
            $(document).off("scroll");

            $('.main-tab-component ul.nav li').each(function () {
                $(this).removeClass('active');
            })
            $(this).parent().addClass('active');

            var target = this.hash,
            $target = $(target);
            window.location.hash = target;
         
            $('html, body').stop().animate({
                'scrollTop': $target.position().top + $(".main-tab-component").position().top - 22
            }, 500, 'swing', function () {

                $(document).on("scroll", onScroll);
                setTabPostion();
            });

        });
        function setTabPostion() {
            if ($(".main-tab-component").length > 0) {
                var divHeight = $(".main-tab-component").position().top;
                var scrollPos = $(document).scrollTop() - divHeight;
                $('.main-tab-component ul.nav li a').each(function (i) {
                    var currLink = $(this);
                    var refElement = $(currLink.attr("href"));
                    var scrollPos1 = $("html,body").scrollTop() - divHeight + 70;

                    if (refElement.position().top <= scrollPos1 && refElement.position().top + refElement.height() > scrollPos) {
                        $('.main-tab-component ul.nav li').removeClass("active");
                        if (i !== 0) {
                            $('.main-tab-component .menu').css("top", -(($(".nav-item").height() * (i)) - ($(".nav-item").height() * .50)));
                        } else {
                            $('.main-tab-component .menu').css("top", 0);
                        }
                        currLink.parent().addClass("active");
                    }
                });
            }
        }


        function onScroll(event) {
            if ($(".main-tab-component .menu").hasClass("sticky")) {
                setTabPostion();
            }
        }
        $(".main-tab-component .tab-content").addClass("tab-content1").removeClass("tab-content");
        $("#tabs").addClass("tabs1");
        
        $(window).scroll(function (e) {
            if ($(".main-tab-component").length > 0) {

                var divHeight = $(".main-tab-component").position().top;
                var $el = $('#myTab2');
                if ($(this).scrollTop() > divHeight && ($(this).scrollTop() < divHeight + $("#myTabContent").height() - $(".menu").height())) {
                    $el.addClass("sticky");
                } else {
                    if (($(this).scrollTop() > divHeight + $("#myTabContent").height() - $(".menu").height())) {
                        $('.main-tab-component .menu').css("top", 0);
                        $(".main-tab-component .tab-content1").addClass("tab-content non-margin").removeClass("tab-content1");
                        $(".main-tab-component .tabs1").removeClass("tabs1");

                        $(document).off("scroll");
                        $('.main-tab-component ul.nav li').addClass("collapse");


                        $('.main-tab-component ul.nav li').removeClass("active");
                        $('.main-tab-component ul.nav li:last-child').addClass("active");

                        $('.main-tab-component .tab-content .tab-pane').removeClass('active in');
                        $('.main-tab-component .tab-content .tab-pane:last-child').addClass('active in');
                    }
                    $el.removeClass("sticky");

                }
            }
        });
        /*position fixed while scroll up*/
    } else {
        $(".main-tab-component .tab-content1").addClass("tab-content").removeClass("tab-content1");
        $(".main-tab-component .tabs1").removeClass("tabs1");
    }
    $('.compare-accordions .expandable-section .panel-title a').on('keydown', function (e) {
        if ((e.key == 'Escape' && !$(this).hasClass('collapsed')) || e.key == 'Enter' || e.key == ' ') {
            $(this).click();
        }
    })
});
var matchHeight = function () {
    function init() {
        eventListeners();
        matchHeight();
    }
    function eventListeners() {
        $(window).on('resize', function () {
            matchHeight();
        });
    }
    function matchHeight() {
        // var groupName = $('[data-match-height]');
        var groupName = $('.full-width-half-half-carousel .col-md-6');
        var groupHeights = [];
        groupName.css('min-height', 'auto');
        groupName.each(function () {

            groupHeights.push($(this).outerHeight());
        });
        var maxHeight = Math.max.apply(null, groupHeights);

        groupName.css('min-height', maxHeight);
    };
    return {
        init: init
    };
}();

//Equal Height

//Equal Height
var matchHeight2 = function () {
    function init() {
        eventListeners();
        matchHeight2();
    }
    function eventListeners() {
        $(window).on('resize', function () {
            matchHeight2();
        });
    }
    function matchHeight2() {
        var groupName = $('[data-match-height]');
        // var groupName = $('.field-overlay');
        var groupHeights = [];
        groupName.css('min-height', 'auto');
        groupName.each(function () {
            groupHeights.push($(this).outerHeight());
        });
        var maxHeight = Math.max.apply(null, groupHeights);
        groupName.css('min-height', maxHeight);
    };
    return {
        init: init
    };
}();

//RTB  Focus
$(document).ready(function () {
    $('.rtb-anchor.scroll-to-anchor').on('click keydown', function (e) {
        if (e.type == 'click' || e.keyCode == 13 || e.key == 'Enter' || e.keyCode == 32) {
            if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
                var target = $(this.hash);
                target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
                if (target.length) {
                    $('html, body').animate({
                        scrollTop: target.offset().top
                    }, 1000);
                    target.focus(); //Setting focus
                    if (target.is(":focus")) { //checking if the target was focused
                        return false;
                    } else {
                        target.attr('tabindex', '-1'); //Adding tabindex for elements not focusable
                        target.focus(); //Setting focus
                    };
                    return false;
                }
            }
        }
    });
})
