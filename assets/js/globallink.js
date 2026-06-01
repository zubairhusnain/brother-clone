/**
 * 環境情報
 */
const CONST_CONFIG = {
    DOMAIN: "https://web.global.brother/globallink",
    ID_OUTPUT_AREA: "globallink-load-area",
};

/**
 * ブレイクポイント定義
 */
const CONST_MEDIA = {
    SMART_PHONE_MAX: "(max-width: 639px)",
};

/**
 * エラーメッセージ定義
 */
const CONST_MSG = {
    MSG_OUTPUT_AREA_ERROR:
        "Unable to get output area. Prepare a div component with the specified id. id=" +
        CONST_CONFIG.ID_OUTPUT_AREA,
    MSG_GLOBALLINK_TXT_ERROR:
        "Unable to get Globallink information. Please contact the administrator.",
    MSG_LOCALIZE_ERROR:
        "Unable to get localization information. Please contact the administrator.",
};

/**
 * Globallink表示
 * @param {String} language_id 言語ID
 */
function loadGloballink(language_id) {
    let loadArea = "";
    let globallinkTxt = "";
    let localizeTxt = "";

    // 出力エリア取得
    loadArea = document.getElementById(CONST_CONFIG.ID_OUTPUT_AREA);
    if (!loadArea) {
        throw CONST_MSG.MSG_OUTPUT_AREA_ERROR;
    }

    // Globallinkテキスト取得
    getGloballinkText(function (globallinkResponse) {
        globallinkTxt = globallinkResponse;

        // ローカライズテキスト取得
        getLocalizeText(language_id, function (localizeResponse) {
            localizeTxt = localizeResponse;

            // ローカライズ情報出力
            var script = document.createElement("script");
            script.innerHTML = localizeResponse;
            document.body.appendChild(script);

            // Globallink整形
            globallinkTxt = globallinkTxt
                .replace(/#selectLanguageMsg#/g, CONST_LOCALIZATION.selectLanguageMsg)
                .replace(/#america#/g, CONST_LOCALIZATION.america)
                .replace(/#europe#/g, CONST_LOCALIZATION.europe)
                .replace(/#africa#/g, CONST_LOCALIZATION.africa)
                .replace(/#asia#/g, CONST_LOCALIZATION.asia)
                .replace(/#selectCategoryMsg#/g, CONST_LOCALIZATION.selectCategoryMsg);

            // Globallink出力
            loadArea.innerHTML = globallinkTxt;

            // 画面動作処理設定
            setAccordionEvent();
        });
    });
}

/**
 * Globallinkテキスト取得
 * @param {Function} nextFunction 次の処理（コールバック関数）
 */
function getGloballinkText(nextFunction) {
    var url = CONST_CONFIG.DOMAIN + "/link_file/globallink.txt";
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                // 取得したGloballinkテキストを次の処理に渡す
                nextFunction(xhr.responseText);
            } else {
                throw CONST_MSG.MSG_GLOBALLINK_TXT_ERROR;
            }
        }
    };
    xhr.open("GET", url, true);
    xhr.send(null);
}

/**
 * ローカライズテキスト取得
 * @param {String} language_id 言語ID
 * @param {Function} nextFunction 次の処理（コールバック関数）
 */
function getLocalizeText(language_id, nextFunction) {
    var url = CONST_CONFIG.DOMAIN + "/localize_file/localize_" + language_id + ".txt";
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                // 取得したローカライズ情報を次の処理に渡す
                nextFunction(xhr.responseText);
            } else if (language_id === "en") {
                // 言語ID：英語で取得失敗した場合、エラー
                throw CONST_MSG.MSG_LOCALIZE_ERROR;
            } else {
                // 言語ID：英語以外で取得失敗した場合、英語でリトライ
                getLocalizeText("en", nextFunction);
            }
        }
    };
    xhr.open("GET", url, true);
    xhr.send(null);
}

/**
 * 画面動作処理設定
 */
function setAccordionEvent() {
    // Globallinkエリア要素取得
    var globallinkElem = document.querySelectorAll(
        "#globallink-load-area .global-link"
    );
    if (globallinkElem.length > 0) {
        Array.from(globallinkElem).forEach(function (v) {
            // 要素取得
            // トップバー
            var btnAreaSelector = v.querySelector(".btn-area-selector");
            // トップバーラベル
            var labelAreaSelector = v.querySelector(".btn-area-selector .txt");
            // トップバーラベルのテキスト
            var defaultLabelAreaSelector = labelAreaSelector.textContent;
            // 国/地域・言語一覧エリア
            var wrapArea = v.querySelector(".wrap-areas");
            // 地域バー
            var areaGroupTitle = v.querySelectorAll(".areas .group .title");
            // 言語リンク
            var areaLinks = v.querySelectorAll(
                ".wrap-areas .areas .group .language-link"
            );
            // 製品およびサポート情報リンク一覧開閉トリガー
            var btnProductSelector = v.querySelector(".toggle-products");
            // 製品およびサポート情報リンク一覧エリア
            var wrapProduct = v.querySelector(".wrap-products");
            // 国言語ごとの製品およびサポート情報リンク
            var productContainers = v.querySelectorAll(".wrap-products .products");
            // 製品カテゴリバー
            var productGroupTitle = v.querySelectorAll(
                ".wrap-products .products .group .title"
            );

            // トップバー押下で、国/地域・言語一覧エリアの表示/非表示を切り替える
            var accordionArea = instantiateAccordion(
                btnAreaSelector,
                wrapArea,
                CONST_MEDIA.SMART_PHONE_MAX,
                function () {
                    return true;
                },
                function () {
                    return true;
                }
            );

            // 初期表示時、国/地域・言語一覧が開いた状態にする
            var queryStr = location.search;
            if (queryStr !== "?closed") {
                simulateClick(btnAreaSelector);
            }

            // トップバー押下で、国/地域・言語一覧エリアの表示するとき、
            // トップバーのラベルを、ナビゲーションメッセージに戻し、
            // 製品およびサポート情報リンク一覧エリアを非表示にする
            accordionArea.setOnToggleClickedCallback(function (isOpen) {
                if (isOpen) {
                    labelAreaSelector.textContent = defaultLabelAreaSelector;
                    btnAreaSelector.classList.remove("is-ok");
                    accordionProduct.close();
                }
            });

            // PC/SP切り替え時、トップバーのラベルを、ナビゲーションメッセージに戻す
            matchMedia(CONST_MEDIA.SMART_PHONE_MAX).addListener(function () {
                labelAreaSelector.textContent = defaultLabelAreaSelector;
                btnAreaSelector.classList.remove("is-ok");
                return true;
            });

            // 製品およびサポート情報リンク一覧エリアの表示/非表示を切り替える
            var accordionProduct = instantiateAccordion(
                btnProductSelector,
                wrapProduct,
                CONST_MEDIA.SMART_PHONE_MAX,
                function () {
                    return false;
                },
                function () {
                    return true;
                },
                true
            );

            // 言語リンク押下時
            Array.from(areaLinks).forEach(function (v) {
                setOnClick(v, function () {
                    Array.from(productContainers).forEach(function (productContainer) {
                        if (v.getAttribute("href").replace("#", "") === productContainer.id.replace("#", "")) {
                            // 押下されていないエリアに非表示クラス付与
                            if (productContainer.classList.contains("is-hidden")) {
                                productContainer.classList.remove("is-hidden");
                            }
                        } else {
                            // 押下言語の製品およびサポート情報リンク一覧エリアに表示クラス付与
                            if (!productContainer.classList.contains("is-hidden")) {
                                productContainer.classList.add("is-hidden");
                            }
                        }
                    });
                    // トップバーのラベルを、選択した言語が所属する国名に変更
                    labelAreaSelector.textContent = v.getAttribute("data-name");
                    btnAreaSelector.classList.add("is-ok");
                    // 国/地域・言語一覧エリアを非表示
                    accordionArea.close();
                    // 押下言語の製品およびサポート情報リンク一覧エリアを表示
                    setTimeout(function () {
                        accordionProduct.open();
                    }, 200);
                    return false;
                });
            });

            // スマホの場合、地域バー配下の国言語一覧の表示/非表示を切り替える
            Array.from(areaGroupTitle).forEach(function (t) {
                var list = t.nextElementSibling;
                instantiateAccordion(
                    t,
                    list,
                    CONST_MEDIA.SMART_PHONE_MAX,
                    function () {
                        return !matchMedia(CONST_MEDIA.SMART_PHONE_MAX).matches;
                    },
                    function () {
                        return matchMedia(CONST_MEDIA.SMART_PHONE_MAX).matches;
                    }
                );
            });

            // スマホの場合、製品カテゴリバー配下の製品リンク一覧の表示/非表示を切り替える
            Array.from(productGroupTitle).forEach(function (t) {
                t.classList.add("is-accordion");
                var list = t.nextElementSibling;
                instantiateAccordion(
                    t,
                    list,
                    CONST_MEDIA.SMART_PHONE_MAX,
                    function () {
                        return !matchMedia(CONST_MEDIA.SMART_PHONE_MAX).matches;
                    },
                    function () {
                        return matchMedia(CONST_MEDIA.SMART_PHONE_MAX).matches;
                    }
                );
            });
        });
    }
}

/**
 * 指定した要素にスクロールする
 * @param elem 要素
 */
function Jump(elem) {
    var content = document.querySelector(elem);
    // 画面上部から要素までの距離
    const rectTop = content.getBoundingClientRect().top;
    // 現在のスクロール距離
    const offsetTop = window.pageYOffset;
    // スクロール位置に持たせるバッファ
    const buffer = 0;
    const top = rectTop + offsetTop - buffer;

    window.scrollTo(0, top);
}

/**
 * 指定した要素に onClick コールバックを登録する
 * @param elem 要素
 * @param onClickFunc onClick コールバック
 */
function setOnClick(elem, onClickFunc) {
    if (elem.addEventListener) {
        elem.addEventListener("click", onClickFunc);
    } else {
        elem.attachEvent("onclick", onClickFunc);
    }
}

/**
 * 指定した要素をクリックする
 * @param elem 要素
 */
function simulateClick(elem) {
    var evt = document.createEvent("HTMLEvents");
    evt.initEvent("click", true, false);
    elem.dispatchEvent(evt);
}

/**
 * 引数で指定した箇所にアコーディオン処理を適用する
 * @param {Element} triggerElem クリックするとアコーディオンを開閉できるようにする要素
 * @param {Element} contentsElem 開閉するアコーディオンの要素
 * @param {String} breakpoint メディアクエリの文字列表現。この境界値をまたぐ度にアコーディオンの開閉がリセットされる
 * @param {Function} isOpenDefaultFunc プレディケート関数。true：アコーディオン開く、false ：アコーディオン閉じる
 * @param {Function} isEnableAccordionFunc プレディケート関数。true：アコーディオン有効、false ：アコーディオン無効
 * @param {Boolean} isEnableScrollWhenMobile true：アコーディオンを開いた時、スクロールを上部に移動
 */
function instantiateAccordion(
    triggerElem,
    contentsElem,
    breakpoint,
    isOpenDefaultFunc,
    isEnableAccordionFunc,
    isEnableScrollWhenMobile
) {
    var openClass = "is-open";
    var isLocked = false;

    // アコーディオン開く
    var open = function (fastopen) {
        if (!isLocked) {
            triggerElem.classList.add(openClass);
            contentsElem.classList.add(openClass);
            contentsElem.parentNode.classList.add("parent-" + openClass);
            contentsElem.style.height = contentsElem.scrollHeight + "px";

            if (fastopen) {
                if (triggerElem.classList.contains(openClass)) {
                    // 開くアニメーション終了直後にautoにしておくことで、開いている間に中身の高さが変動しても新しい高さが反映される
                    contentsElem.style.height = "auto";
                    if (typeof isEnableScrollWhenMobile !== "undefined") {
                        Jump(".global-link");
                    }
                }
            } else {
                setTimeout(function () {
                    if (triggerElem.classList.contains(openClass)) {
                        // 開くアニメーション終了直後にautoにしておくことで、開いている間に中身の高さが変動しても新しい高さが反映される
                        contentsElem.style.height = "auto";
                        if (typeof isEnableScrollWhenMobile !== "undefined") {
                            Jump(".global-link");
                        }
                    }
                }, 100);
            }
        }
    };

    // アコーディオン閉じる
    var close = function (fastclose) {
        if (!isLocked) {
            // heightをautoに変換したか確認するフラグ
            var convertedFromAuto = false;

            triggerElem.classList.remove(openClass);
            contentsElem.classList.remove(openClass);
            contentsElem.parentNode.classList.remove("parent-" + openClass);

            if (contentsElem.style.height === "auto") {
                // auto からはアニメーションが効かないため、px指定に変換する
                contentsElem.style.height = contentsElem.offsetHeight + "px";
                convertedFromAuto = true;
            }

            if (fastclose) {
                if (convertedFromAuto) {
                    contentsElem.style.height = "0px";
                }
            } else {
                setTimeout(
                    function () {
                        contentsElem.style.height = "0px";
                    },
                    convertedFromAuto ? 1 : 0
                );
            }
        }
    };

    // トグル（設定されたクラスをみて、アコーディオンの開閉を実行する）
    var toggle = function () {
        triggerElem.classList.contains(openClass) ? close() : open();
    };

    // トグル前後の関数
    var onBeforeToggle = function () { };
    var onToggleClicked = function () { };

    // 関数定義
    var api = {
        open: open,
        close: close,
        toggle: toggle,
        setLock: function (isLock) {
            isLocked = isLock;
        },
        setOnBeforeToggle: function (fn) {
            onBeforeToggle = fn;
        },
        setOnToggleClickedCallback: function (fn) {
            onToggleClicked = fn;
        },
        addOnToggleClickedCallback: function (fn) {
            onToggleClicked = (function (old) {
                function extendsInit(isOpening, api) {
                    old(isOpening, api);
                    fn(isOpening, api);
                }
                return extendsInit;
            })(onToggleClicked);
        },
    };

    // クリック開閉イベント
    var onClickedTriggerElem = function (event) {
        if (isEnableAccordionFunc() && !isLocked) {
            event.preventDefault
                ? event.preventDefault()
                : (event.returnValue = false);
            onBeforeToggle(triggerElem.classList.contains(openClass), api);
            toggle();
            onToggleClicked(triggerElem.classList.contains(openClass), api);
        }
    };

    // ターゲットの要素にクリック開閉イベントを設定
    if (triggerElem.addEventListener) {
        triggerElem.addEventListener("click", onClickedTriggerElem);
    } else {
        triggerElem.attachEvent("onclick", onClickedTriggerElem);
    }

    // ブレークポイントまたぐ度に開閉をリセット
    matchMedia(breakpoint).addListener(function () {
        if (isOpenDefaultFunc()) {
            open(true);
        } else {
            close(true);
        }
    });
    return api;
}

/**
 * Production steps of ECMA-262, Edition 6, 22.1.2.1
 * Reference: https://people.mozilla.org/~jorendorff/es6-draft.html#sec-array.from
 * IE11でArrayを使用するために必要
 */
Array.from ||
    (Array.from = (function () {
        var r = Object.prototype.toString,
            n = function (n) {
                return "function" == typeof n || "[object Function]" === r.call(n);
            },
            t = Math.pow(2, 53) - 1,
            e = function (r) {
                var n = (function (r) {
                    var n = Number(r);
                    return isNaN(n)
                        ? 0
                        : 0 !== n && isFinite(n)
                            ? (n > 0 ? 1 : -1) * Math.floor(Math.abs(n))
                            : n;
                })(r);
                return Math.min(Math.max(n, 0), t);
            };
        return function (r) {
            var t = Object(r);
            if (null == r)
                throw new TypeError(
                    "Array.from requires an array-like object - not null or undefined"
                );
            var o,
                a = arguments.length > 1 ? arguments[1] : void 0;
            if (void 0 !== a) {
                if (!n(a))
                    throw new TypeError(
                        "Array.from: when provided, the second argument must be a function"
                    );
                arguments.length > 2 && (o = arguments[2]);
            }
            for (
                var i,
                u = e(t.length),
                f = n(this) ? Object(new this(u)) : new Array(u),
                c = 0;
                c < u;

            )
                (i = t[c]),
                    (f[c] = a ? (void 0 === o ? a(i, c) : a.call(o, i, c)) : i),
                    (c += 1);
            return (f.length = u), f;
        };
    })());
