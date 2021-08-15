/**
 * Allows you to add touch navigation for the slider
 */

class SliderTouchPlugin {
  /**
   *
   * @param {Slider} slider
   */

  constructor(slider) {
    slider.container.addEventListener("dragstart", (e) => e.preventDefault());
    slider.container.addEventListener("mousedown", this.startDrag.bind(this));
    slider.container.addEventListener("touchStart", this.startDrag.bind(this));
    window.addEventListener("mousemove", this.drag.bind(this));
    window.addEventListener("touchmove", this.drag.bind(this));
    window.addEventListener("touchend", this.endDrag.bind(this));
    window.addEventListener("mouseup", this.endDrag.bind(this));
    window.addEventListener("touchcancel", this.endDrag.bind(this));
    this.slider = slider;
  }

  /**
   * Start movement when touched
   * @param {MouseEvent | TouchEvent} e
   */
  startDrag(e) {
    if (e.touches) {
      if (e.touches.length > 1) {
        return;
      } else {
        e = e.touches[0];
      }
    }
    this.origin = { x: e.screenX, y: e.screenY };
    this.width = this.slider.containerWidth;
    this.slider.disableTransition();
    // console.log("StartDrag");
  }

  /**
   * Move
   * @param {MouseEvent | TouchEvent} e
   */
  drag(e) {
    if (this.origin) {
      let point = e.touches ? e.touches[0] : e;
      let translate = {
        x: point.screenX - this.origin.x,
        y: point.screenY - this.origin.y,
      };
      if (e.touches && Math.abs(translate.x) > Math.abs(translate.y)) {
        e.preventDefault();
        e.stopPropagation();
      }
      let baseTranslate =
        (this.slider.currentItem * -100) / this.slider.items.length;
      this.lastTranslate = translate;
      this.slider.translate(baseTranslate + (100 * translate.x) / this.width);
      //   console.log(translate);
    }
  }

  /**
   * End movement
   * @param {MouseEvent | TouchEvent} e
   */
  endDrag(e) {
    if (this.origin && this.lastTranslate) {
      this.slider.enableTransition();
      if (Math.abs(this.lastTranslate.x / this.slider.sliderWidth) > 0.2) {
        if (this.lastTranslate.x < 0) {
          this.slider.next();
        } else {
          this.slider.prev();
        }
      } else {
        this.slider.goToItem(this.slider.currentItem);
      }
    }
    this.origin = null;
  }
}

class Slider {
  /**
   * This callback type is called `requestCallback` and is displayed as a global symbol.
   *
   * @callback moveCallback
   * @param {number} index
   */

  /**
   * @param {HTMLElement} element
   * @param {Object} options
   * @param {Object} [options.slidesToScroll=1] The nr of elements to slide
   * @param {Object} [options.slidesVisible=1] The nr of elements visible per slide
   * @param {Boolean} [options.loop=false] Should go through at the end of the slider
   * @param {Boolean} [options.infinite=false]
   * @param {Boolean} [options.pagination=false]
   * @param {Boolean} [options.navigation=true]
   */
  constructor(element, options = {}) {
    this.element = element;
    this.options = Object.assign(
      {},
      {
        slidesToScroll: 1,
        slidesVisible: 1,
        loop: false,
        pagination: false,
        navigation: true,
        infinite: false,
      },
      options
    );
    if (this.options.loop && this.options.infinite) {
      throw new Error("A Slider cannot be both looped and infinite");
    }

    let children = [].slice.call(element.children);
    this.isMobile = false;
    this.currentItem = 0;
    this.moveCallbacks = [];
    this.offset = 0;

    // DOM Modifications
    this.root = this.createDivWithClass("slider");
    this.container = this.createDivWithClass("slider__container");
    this.root.setAttribute("tabindex", "0");
    this.root.appendChild(this.container);
    this.element.appendChild(this.root);
    this.items = children.map((child) => {
      let item = this.createDivWithClass("slider__item");

      item.appendChild(child);
      return item;
    });

    if (this.options.infinite) {
      this.offset = this.options.slidesVisible + this.options.slidesToScroll;
      if (this.offset > children.length) {
        console.error("You don't have enough elements", element);
      }
      this.items = [
        ...this.items
          .slice(this.items.length - this.offset)
          .map((item) => item.cloneNode(true)),
        ...this.items,
        ...this.items.slice(0, this.offset).map((item) => item.cloneNode(true)),
      ];
      //   console.log(this.items);
      this.goToItem(this.offset, false);
    }

    this.items.forEach((item) => this.container.appendChild(item));

    this.setStyle();
    if (this.options.navigation) {
      this.createNavigation();
    }
    if (this.options.pagination) {
      this.createPagination();
    }

    // Events
    this.moveCallbacks.forEach((cb) => cb(this.currentItem));
    this.onWindowResize();
    window.addEventListener("resize", this.onWindowResize.bind(this));
    this.root.addEventListener("keyup", (e) => {
      if (e.key === "ArrowRight" || e.key === "Right") {
        this.next();
      } else if (e.key === "ArrowLeft" || e.key === "Left") {
        this.prev();
      }
    });
    if (this.options.infinite) {
      this.container.addEventListener(
        "transitionend",
        this.resetInfinite.bind(this)
      );
    }
    new SliderTouchPlugin(this);
  }

  /**
   * Applies the right dimensions to the slider elemets
   */

  setStyle() {
    let ratio = this.items.length / this.slidesVisible;
    this.container.style.width = ratio * 100 + "%";
    this.items.forEach(
      (item) => (item.style.width = 100 / this.slidesVisible / ratio + "%")
    );
  }

  /**
   * Create navigation arrows
   */

  createNavigation() {
    let nextButton = this.createDivWithClass("slider__next");
    let prevButton = this.createDivWithClass("slider__prev");
    this.root.appendChild(nextButton);
    this.root.appendChild(prevButton);
    nextButton.addEventListener("click", this.next.bind(this));
    prevButton.addEventListener("click", this.prev.bind(this));
    if (this.options.loop === false) {
      return;
    }
    this.onMove((index) => {
      if (index === 0) {
        prevButton.classList.add("slider__prev--hidden");
      } else {
        prevButton.classList.remove("slider__prev--hidden");
      }
      if (this.items[this.currentItem + this.slidesVisible] === undefined) {
        nextButton.classList.add("slider__next--hidden");
      } else {
        nextButton.classList.remove("slider__next--hidden");
      }
    });
  }

  /**
   * Create pagination
   */

  createPagination() {
    let pagination = this.createDivWithClass("slider__pagination");
    let buttons = [];
    this.root.appendChild(pagination);
    for (
      let i = 0;
      i < this.items.length - 2 * this.offset;
      i = i + this.options.slidesToScroll
    ) {
      let button = this.createDivWithClass("slider__pagination--button");
      button.addEventListener("click", () => this.goToItem(i + this.offset));
      pagination.appendChild(button);
      buttons.push(button);
    }
    this.onMove((index) => {
      let count = this.items.length - 2 * this.offset;
      let activeButton =
        buttons[
          Math.floor(
            ((index - this.offset) % count) / this.options.slidesToScroll
          )
        ];
      if (activeButton) {
        buttons.forEach((button) =>
          button.classList.remove("slider__pagination--button--active")
        );
        activeButton.classList.add("slider__pagination--button--active");
      }
    });
  }

  translate(percent) {
    this.container.style.transform = "translate3d(" + percent + "%, 0, 0)";
  }

  next() {
    this.goToItem(this.currentItem + this.slidesToScroll);
  }

  prev() {
    this.goToItem(this.currentItem - this.slidesToScroll);
  }

  /**
   * Move the slider to the target element
   * @param {number} index
   * @param {boolean} [animation = true]
   */

  goToItem(index, animation = true) {
    if (index < 0) {
      if (this.options.loop) {
        index = this.items.length - this.slidesVisible;
      } else {
        return;
      }
    } else if (
      index >= this.items.length ||
      (this.items[this.currentItem + this.slidesVisible] === undefined &&
        index > this.currentItem)
    ) {
      if (this.options.loop) {
        index = 0;
      } else {
        return;
      }
    }
    let translateX = (index * -100) / this.items.length;
    if (animation === false) {
      this.disableTransition();
    }
    this.translate(translateX);

    this.container.offsetHeight; // force repaint
    if (animation === false) {
      this.enableTransition();
    }
    this.currentItem = index;
    this.moveCallbacks.forEach((cb) => cb(index));
  }

  /**
   *
   * Move the container to look like an infinite slide
   */

  resetInfinite() {
    if (this.currentItem <= this.options.slidesToScroll) {
      this.goToItem(
        this.currentItem + (this.items.length - 2 * this.offset),
        false
      );
    } else if (this.currentItem >= this.items.length - this.offset) {
      this.goToItem(
        this.currentItem - (this.items.length - 2 * this.offset),
        false
      );
    }
  }

  /**
   *
   * @param {moveCallback} cb
   */

  onMove(cb) {
    this.moveCallbacks.push(cb);
  }

  onWindowResize() {
    let mobile = window.innerWidth < 800;
    if (mobile !== this.isMobile) {
      this.isMobile = mobile;
      this.setStyle();
      this.moveCallbacks.forEach((cb) => cb(this.currentItem));
    }
  }

  /**
   * @param {string} className
   * @returns {HTMLElement}
   */
  createDivWithClass(className) {
    let div = document.createElement("div");
    div.setAttribute("class", className);
    return div;
  }

  disableTransition() {
    this.container.style.transition = "none";
  }

  enableTransition() {
    this.container.style.transition = "";
  }

  /**
   * @returns {number}
   */
  get slidesToScroll() {
    return this.isMobile ? 1 : this.options.slidesToScroll;
  }

  /**
   * @returns {number}
   */

  get slidesVisible() {
    return this.isMobile ? 1 : this.options.slidesVisible;
  }

  /**
   * @returns {number}
   */
  get containerWidth() {
    return this.container.offsetWidth;
  }

  /**
   * @returns {number}
   */
  get sliderWidth() {
    return this.root.offsetWidth;
  }
}

let onReady = function () {
  new Slider(document.querySelector("#slider__main"), {
    slidesVisible: 3,
    slidesToScroll: 1,
    loop: true,
    pagination: true,
  });

  new Slider(document.querySelector("#slider__main2"), {
    slidesVisible: 3,
    slidesToScroll: 3,
    // loop: true,
    pagination: true,
    infinite: true,
  });
};

if (document.readyState !== "loading") {
  onReady();
}
document.addEventListener("DOMContentLoaded", onReady);
