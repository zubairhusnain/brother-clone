
var script = document.createElement('script');
script.type = "text/javascript"
script.src = "/Components/assets/js/pagination.js";

document.head.appendChild(script)

script.onload = function () {
	$('.clearfilter').on('click', function ($e) {

		$('.custom-select').val('Not Selected').trigger("change");
		$('.custom-select-dropdown').val('Not Selected').trigger("change");
		$(".x-blog-custom-pagination").show();
		$(".filter-pagination").hide();
		$e.preventDefault();
		location.reload();
	});
	$(".custom-select, .custom-select-dropdown").change(function () {
		let resultsPerPage = ($("#resultsPPdropdown").length == 0 || $("#resultsPPdropdown option:selected").val() == "Not Selected") ? 30 : Number($("#resultsPPdropdown option:selected").val());
		let category = ($("#categoryDropdown").length == 0 || $("#categoryDropdown option:selected").val() == "Not Selected") ? null : $("#categoryDropdown option:selected").val();
		let theme = ($("#themeDropdown").length == 0 || $("#themeDropdown option:selected").val() == "Not Selected") ? null : $("#themeDropdown option:selected").val();
		let authorkeyword = ($("#authorkeyword").length > 0) ? $("#authorkeyword").val() : null;
		let searchkeyword = ($("#searchkeyword").length > 0) ? $("#searchkeyword").val() : null;
		$(".blog-tiles").children().remove();
		var params = {
			maximumrows: resultsPerPage,
			sc_itemid: $("#home-item-id").val(),
			categoryFilter: category,
			tagFilter: theme,
			authorFilter: authorkeyword,
			searchFilter: searchkeyword
		}
		$.ajax({
			url: "/api/sitecore/Sorting/BlogListInJson",
			method: 'POST',
			type: 'POST',
			data: params,
			dataType: "json",
			success: function (results) {
				$(".blog-tiles").children().remove();
				if (results.length > 0) {
					var container = $(".filter-pagination");
					// container.children().remove();
					var sources = function () {
						var resultArray = [];

						results.forEach(function (data, index) {
							resultArray.push(data);
						})
						return resultArray;
					}();
					var upperRange = resultsPerPage;
					var lowerRange = 1;
					var options = {
						dataSource: sources,
						totalNumber: sources.length,
						pageSize: resultsPerPage,
						callback: function (response, pagination) {
							window.console && console.log(response, pagination);
							$(".blog-tiles").children().remove();
							container.find("ul").addClass("pagination");
							let prevPageNo = pagination.pageNumber - 1;
							lowerRange = (pagination.pageSize * prevPageNo) + 1;
							upperRange = lowerRange + response.length - 1; //pagination.pageNumber * pagination.pageSize;
							let perPageData = String("showing " + lowerRange + "-" + upperRange + " of " + sources.length + " articles");
							$(".x-blog-page-data span").text(perPageData);
							$.each(response, function (index, data) {
								let categoryFilter = (data.CategoryFilter != undefined || data.CategoryFilter != null) ? data.CategoryFilter : "";
								let tagFilter = (data.TagFilter != undefined || data.TagFilter != null) ? data.TagFilter : "";
								let filterNames = (categoryFilter != "" && tagFilter != "") ? (categoryFilter + "|" + tagFilter).split("|") : [];
								let filterUrls = data.CategoryUrl.concat(data.TagUrl);
								let tagHTML = '';
								let count = 0;
								filterNames.forEach(function (filter, index) {
									if (count == 0) {
										tagHTML += "<span><a class='tag-red' href=" + filterUrls[index].replace(' ', '-') + ">" + filter + "</a></span>"
										count++;
									}
									else if (count == 1) {
										tagHTML += "<span><a class='tag-blue' href=" + filterUrls[index].replace(' ', '-') + ">" + filter + "</a></span>"
										count++;
									}
									else {
										tagHTML += "<span><a class='tag-green' href=" + filterUrls[index].replace(' ', '-') + ">" + filter + "</a></span>"
										count = 0;
									}

								})
								let authorFilter = (data.AuthorFilter != undefined || data.AuthorFilter != null) ? data.AuthorFilter.split("|") : []
								let authorHTML = '';
								authorFilter.forEach(function (filter, index) {
									authorHTML += "<h5 class='name'><a href=" + data.AuthorUrl[index].replace(' ', '-') + ">" + filter + "</a></h5>"
								})
								$(".blog-tiles").append("<div class='col-lg-4'><div class='x-blog-card'><div class='x-blog-card-img'><a href=" + data.BlogUrl.replace(' ', '-') + "><img src=" + data.ImagePath + " alt='img'></a></div><div class='x-blog-card-tags'>" + tagHTML + "</div><div class='card-discription-wrapp mt-4'><p><a href=" + data.BlogUrl.replace(' ', '-') + ">" + data.Title + "</a></p></div><div class='x-blog-card-profile'><div class='card-profile-img'></div><div class='card-profile-description'>" + authorHTML + "<span class='date'>" + data.PublishedDate + "</span></div></div></div></div>");
							});
						}
					};

					var paginationInstance = container.pagination(options);

					paginationInstance.addHook('beforeInit', function () {
						console.log('beforeInit...');
					});

					paginationInstance.addHook('beforePageOnClick', function () {
						console.log('beforePageOnClick...');
					});

					$(".x-blog-custom-pagination").hide()
				}
				else {
					$(".blog-tiles").append("<span>Sorry no matching results were found.</span>");
					$(".filter-pagination").children().remove();
					$(".x-blog-page-data span").text("Showing 1-0 of 0 articles");
				}
			}
		});
	})
}