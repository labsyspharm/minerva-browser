
class SimpleEventHandler {

    constructor(subject) {
        this.subject = subject;
        this.eventListeners = [];

        //define list of possible events
        this.events = {
            testEvent: 'testEvent',
            osdClickEvent: 'osdClickEvent',
        };
    }

    bind(eventNames, eventFunction) {
        for (const eventName of eventNames.split(' ')) {
            this.eventListeners.push({eventName, eventFunction});
            const eventFunctionWrap = e => eventFunction(e.detail, e);
            this.subject.addEventListener(eventName, eventFunctionWrap, false);
        }
    }

    getListeners() {
        return this.eventListeners;
    }

    trigger(eventName, detail) {
        this.subject.dispatchEvent(new CustomEvent(eventName, {detail}));
    }
}