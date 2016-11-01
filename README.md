# OrderManager

This class is a utility for ordering items within groups and persisting the
changes to the order of the items. The order of groups relative to each other
is random at the time of insertion of a new group, but the chosen position of
the group's items is saved so that it's consistent with later appearances.

This utility is used by the [InboxSDK](https://www.inboxsdk.com/) to order the
widgets (such as sidebar panels) added by different extensions. A single
extension may add multiple sidebar panels together in a specific order, but the
extension can not define whether its panels appear before or after panels from
other extensions. The user may drag-and-drop panels into a new order, even
across groups, and the new order of the panels will be persisted to the next
time the user returns to the application.

## API

This module exports the OrderManager class, which must be instantiated with
`new` and has several public methods.

### new OrderManager({get, set, maxLimit})

When constructing an OrderManager instance, you must pass an object with `get`
and `set` properties and optionally a `maxLimit` property.

`get` and `set` must be functions that OrderManager can use to retrieve and
save persisted data. `get` should return the value that was last passed to
`set` or null. The value given to `set` will always be JSONifiable. See the
Example section below for an example implementation of `get` and `set` using
localStorage.

`maxLimit` may be a number setting the maximum number of items to remember the
positioning for. This defaults to 200.

### orderManager.addItem(item)

The `item` parameter must be an object of the following type, where the type
`T` used in the `value` property represents any specific type:

```js
type Item<T> = {
  groupId: string;
  id: string;
  orderHint: number;
  value: T;
};
```

`groupId` and `id` must be strings used to identify the item. Items with the
same `groupId` will be grouped together. Within a group, items are sorted in
ascending order based on the `orderHint`.

The `id` string is used to identify an item within a group and used to identify
the element in remembering how it has been moved by the user.

### orderManager.getOrderedItems(): Array<Item<T>>

Retrieve the ordered list of added items. Don't try to mutate the array or
objects directly in it.

### orderManager.moveItem(sourceIndex: number, destinationIndex: number)

Move an item from one position in the ordered list to another. The change will
be persisted so that the item will be added into the same position relative to
the other current items in the future.

### orderManager.updateItemValue(groupId: string, id: string, value: T)

Update the value property of an item identified by its groupId and id.

### orderManager.updateItemValueByIndex(index: number, value: T)

Update the value property of an item identified by its current index.

### orderManager.removeItem(groupId: string, id: string)

This removes a previously added item identified by its groupId and id.

### orderManager.removeItemByIndex(index: number)

This removes a previously added item identified by its groupId and id.

## Example

```javascript
const OrderManager = require('order-manager');

const orderManager = new OrderManager({
  get() {
    return JSON.parse(localStorage.getItem('order-test'));
  },
  set(v) {
    localStorage.setItem('order-test', JSON.stringify(v));
  }
});

orderManager.addItem({
  groupId: 'numbers',
  id: 'one',
  orderHint: 1,
  value: {title: 'One', description: 'The first number'}
});
orderManager.addItem({
  groupId: 'numbers',
  id: 'two',
  orderHint: 2,
  value: {title: 'Two', description: 'The second number'}
});
orderManager.addItem({
  groupId: 'numbers',
  id: 'three',
  orderHint: 3,
  value: {title: 'Three', description: 'The third number'}
});
orderManager.addItem({
  groupId: 'planets',
  id: 'venus',
  orderHint: 2,
  value: {title: 'Venus', description: 'The second planet from the Sun'}
});

console.log(orderManager.getOrderedItems().map(item => item.value.title));
// Unless orderManager.moveItem has been called in a previous session, then
// this will output either of the following:
// ["One", "Two", "Three", "Venus"]
// ["Venus", "One", "Two", "Three"]
```

## Types

[Flow](https://flowtype.org/) type declarations for this module are included!
As of Flow v0.34, you must add the following entries to your `.flowconfig`
file's options section for them to work:

```
[options]
esproposal.class_static_fields=enable
esproposal.class_instance_fields=enable
```
