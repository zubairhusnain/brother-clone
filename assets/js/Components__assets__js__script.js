$(document).ready(function () {

	$('.match-slider').slick({

		dots: false,
		infinite: false,
		speed: 300,
		slidesToShow: 4,
		slidesToScroll: 4,

		responsive: [

			{
				breakpoint: 1440,
				settings: {
					slidesToShow: 3,
					slidesToScroll: 3,
					infinite: false,
					dots: false
				}
			},
			{
				breakpoint: 1024,
				settings: {
					slidesToShow: 2,
					slidesToScroll: 1,
					infinite: false,
					dots: false
				}
			},
			{
				breakpoint: 600,
				settings: {
					slidesToShow: 1,
					slidesToScroll: 1
				}
			},
			{
				breakpoint: 480,
				settings: {
					slidesToShow: 1,
					slidesToScroll: 1
				}
			}
			// You can unslick at a given breakpoint now by adding:
			// settings: "unslick"
			// instead of a settings object
		]
	});
});


$(document).ready(function () {
	$(".left-menu-icon").click(function () {
		$(".left-menu").toggleClass("left-menu-open");
	});

	$(".has-dropdown").click(function () {
		$(".sub-menu").toggleClass("open");
	});

	// $(".nav-dropdown.toggle").click(function(){
	//   $("sub-menu").slideToggle(1500);
	//   $(this).toggleClass("open");
	// });

	$('.txtSearch').keypress(function (e) {
		if (e.keyCode === 13) {
			myFunction($(this).val());
			return false;
		}
		return true;
	});

	myFunction = function (searchvalue) {

		if (searchvalue && searchvalue.trim() != "") {
			let urlarray = window.location.pathname.split("/");
			let searchpathname = "/" + urlarray[1] + "/" + urlarray[2];
			window.location.href = searchpathname + '/searchterm/' + searchvalue;
		}
	}

	$(".search-input-wrapp").each(function () {
		$('input[type="text"].txtSearch').on('keyup', function (event) {
			var txtSearch_value = event.target.value;
			if (txtSearch_value?.trim() != '') {
				$('#btnSearch img').addClass('opacity1');
			} else {
				$('#btnSearch img').removeClass('opacity1');
			}
		});
		$(this).find("#btnSearch").click(function () {
			let searchPara = $(this).siblings("input[type='text']").eq(0).val();
			
			if (searchPara && searchPara.trim() != "") {
				myFunction(searchPara);
			}
		})

	})


	$(".comment-form").each(function (index, item) {
		let commentForm = item;
		$(this).find("#submit").click(function (event) {
			let email_reg = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
			let emailinput = $(commentForm).find('#Email').val();
			let userName = $(commentForm).find("#Username").val();
			let comment = $(commentForm).find("#Comment").val();




			if (email_reg.test(emailinput) == false || emailinput == "" || userName == "" || comment == "") {
				event.preventDefault();
				$('#fail-msg').show();
			} else {



				$('#fail-msg').hide();
			}
		});
		window.onscroll = fixAtTop;
		const successMessage = document.getElementsByClassName('success-message');
		const failureMessage = document.getElementsByClassName('fail-message');
		function fixAtTop() {
			if (!successMessage[0] || !failureMessage[0]) {
				return;
			}
			if (window.scrollY <= 144) {
				successMessage[0].style.top = '134px';
				failureMessage[0].style.top = '134px';
			} else {
				successMessage[0].style.top = '20px';
				failureMessage[0].style.top = '20px';
			}
		}
	});

});
window.addEventListener("pageshow", () => {
	$('input[type="text"].txtSearch').val("");
});