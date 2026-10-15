// A small order workflow with a state machine inside it.
//
//   draft -> submitted -> paid -> shipped
//     \         \          \
//      ---------------------> cancelled
//
// This service has a deliberate bug in refund(): it checks the amount
// against the order total, but it does not subtract the amount that was
// already refunded. Two refunds can return more money than was paid.
// The model-based test in test/orderWorkflow.test.js finds this.

export class OrderService {
  #state = "draft";
  #items = [];
  #paid = 0;
  #refunded = 0;

  state() { return this.#state; }
  total() { return this.#items.reduce((t, i) => t + i.price, 0); }
  paid() { return this.#paid; }
  refunded() { return this.#refunded; }

  addItem(item) {
    this.#require("draft", "addItem");
    if (!(item.price > 0)) throw new Error("price must be positive");
    this.#items.push({ price: item.price });
  }

  removeItem(index) {
    this.#require("draft", "removeItem");
    if (index < 0 || index >= this.#items.length) throw new Error("no such item");
    this.#items.splice(index, 1);
  }

  submit() {
    this.#require("draft", "submit");
    if (this.#items.length === 0) throw new Error("cannot submit an empty order");
    this.#state = "submitted";
  }

  pay() {
    this.#require("submitted", "pay");
    this.#paid = this.total();
    this.#state = "paid";
  }

  ship() {
    this.#require("paid", "ship");
    this.#state = "shipped";
  }

  cancel() {
    if (this.#state === "shipped" || this.#state === "cancelled") {
      throw new Error(`cannot cancel an order that is ${this.#state}`);
    }
    this.#state = "cancelled";
  }

  refund(amount) {
    this.#require("cancelled", "refund");
    if (!(amount > 0)) throw new Error("amount must be positive");
    // BUG: this should compare against (paid - refunded), not total.
    if (amount > this.total()) throw new Error("refund is more than the order total");
    this.#refunded += amount;
  }

  #require(state, op) {
    if (this.#state !== state) {
      throw new Error(`${op} is not allowed when the order is ${this.#state}`);
    }
  }
}
