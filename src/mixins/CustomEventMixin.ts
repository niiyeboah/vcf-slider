export type Constructor<T = HTMLElement> = new (...args: any[]) => T;

export type CounterChangedEvent = CustomEvent<{ counter: number }>;

export enum CustomEvents {
  counterChanged = 'counter-changed',
}

export interface SliderCustomEventMap {
  [CustomEvents.counterChanged]: CounterChangedEvent;
}

export interface SliderEventMap extends HTMLElementEventMap, SliderCustomEventMap {}

export function CustomEventMixin<TElement extends Constructor>(BaseElement: TElement) {
  return class CustomEventTarget extends BaseElement {
    addEventListener<K extends keyof SliderEventMap>(
      type: K,
      listener: (this: CustomEventTarget, e: SliderEventMap[K]) => void,
      options?: AddEventListenerOptions | boolean
    ): void;

    addEventListener(
      type: string,
      listener: (this: CustomEventTarget, e: Event) => void,
      options?: boolean | AddEventListenerOptions
    ) {
      super.addEventListener(type, listener, options);
    }

    removeEventListener<K extends keyof SliderEventMap>(
      type: K,
      listener: (this: CustomEventTarget, e: SliderEventMap[K]) => void,
      options?: EventListenerOptions | boolean
    ): void;

    removeEventListener(
      type: string,
      listener: (this: CustomEventTarget, e: Event) => void,
      options?: boolean | AddEventListenerOptions
    ) {
      super.removeEventListener(type, listener, options);
    }
  };
}
