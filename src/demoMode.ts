/**
 * @file demoMode.ts
 * @description The demo mode script for qeen Core SDK.
 * @description This script is used when running in demo mode via iframe.
 */

/**.
 * Function for applying content replacement.
 * @param {string} domPath - The DOM path of the target element.
 * @param {string} content - Content to be replaced.
 * @description Used when running in demo mode via iframe.
 */
function renderDemoContent(domPath: string, content: string): void {
  const elements: NodeListOf<Element> | null = document.querySelectorAll(domPath);
  elements.forEach((element: Element) => {
    element.innerHTML = content;
  });
}

/**
 * Function for scrolling to a target element.
 * @param {string} domPath - The DOM path of the target element.
 * @param {number} offset - The offset value.
 * @description Used when running in demo mode via iframe.
 */
function scrollToTarget(domPath: string, offset: number): void {
  const element: HTMLElement | null = document.querySelector(domPath);
  if (element) {
    window.scrollTo({
      behavior: 'smooth',
      top:
        element.getBoundingClientRect().top -
        document.body.getBoundingClientRect().top -
        offset,
    });
  }
}

/**
 * Function for receiving messages from the parent window.
 * @param {any} event - The event object.
 * @description Used when running in demo mode via iframe.
 */
const receiveMessage = (event: any): void => {
  if (event) {
    if (event?.data?.action === 'renderDemoContent') {
      renderDemoContent(event.data?.domPath, event.data?.content);
    } else if (event.data?.action === 'scrollToTarget') {
      scrollToTarget(event.data?.domPath, 100);
    }
  }
};
export { receiveMessage };
