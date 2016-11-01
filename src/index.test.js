/* @flow */

import OrderManager from './index';
import seed from 'seed-random';
import times from 'lodash/times';
import MockStorage from 'mock-webstorage';

afterEach(() => {
  seed.resetGlobal();
});

function makeOptions(storage: Object) {
  return {
    get() {
      return JSON.parse(storage.getItem('k'));
    },
    set(pdata) {
      storage.setItem('k', JSON.stringify(pdata));
    }
  };
}

test('addItem, removeItem', () => {
  const storage: Object = new MockStorage();
  const o = new OrderManager(makeOptions(storage));

  const first = o.getOrderedItems();
  expect(first).toEqual([]);
  o.addItem({
    groupId: 'blah',
    id: 'foo',
    orderHint: 0,
    value: {v: 'foo'}
  });

  const second = o.getOrderedItems();
  expect(second).toEqual([{
    groupId: 'blah',
    id: 'foo',
    orderHint: 0,
    value: {v: 'foo'}
  }]);

  // Make sure we didn't mutate the returned array.
  expect(first).toEqual([]);

  o.removeItem('blah', 'bar');
  expect(o.getOrderedItems().length).toBe(1);
  o.removeItem('blah', 'foo');
  expect(o.getOrderedItems().length).toBe(0);

  // Make sure we didn't mutate the returned array.
  expect(second.length).toBe(1);
});

test('orderHint within group is respected', () => {
  const storage: Object = new MockStorage();
  const o = new OrderManager(makeOptions(storage));
  o.addItem({
    groupId: 'planets',
    id: 'mercury',
    orderHint: -1,
    value: {v: 'Mercury'}
  });
  o.addItem({
    groupId: 'planets',
    id: 'earth',
    orderHint: 1,
    value: {v: 'Earth'}
  });
  o.addItem({
    groupId: 'planets',
    id: 'venus',
    orderHint: 0,
    value: {v: 'Venus'}
  });
  o.addItem({
    groupId: 'planets',
    id: 'mars',
    orderHint: 1.1,
    value: {v: 'Mars'}
  });
  expect(o.getOrderedItems().map(x => x.id))
    .toEqual(['mercury', 'venus', 'earth', 'mars']);
});

test('handles set fails', () => {
  const storage: Object = new MockStorage();
  storage.setItem = () => {};
  const o = new OrderManager(makeOptions(storage));
  o.addItem({
    groupId: 'planets',
    id: 'mercury',
    orderHint: -1,
    value: {v: 'Mercury'}
  });
  o.addItem({
    groupId: 'planets',
    id: 'earth',
    orderHint: 1,
    value: {v: 'Earth'}
  });
  expect(o.getOrderedItems().length).toBe(2);
});

test('culls old entries from persisted data as it grows large', () => {
  class LimitedMockStorage extends MockStorage {
    setItem(k, v) {
      expect(v.length).toBeLessThan(20000);
      super.setItem(k, v);
    }
  }
  const storage: Object = new LimitedMockStorage();
  const o = new OrderManager(makeOptions(storage));
  for (let i=4600; i<5000; i++) {
    o.addItem({
      groupId: 'blah',
      id: `foo ${i}`,
      orderHint: -i,
      value: {v: `Foo ${i}`}
    });
    if (i >= 2) {
      o.removeItem('blah', `foo ${i-2}`);
    }
  }
  expect(o.getOrderedItems().map(x => x.id)).toEqual(['foo 4999', 'foo 4998']);
});

test('orderHint is not respected across groups, and picked order persists', () => {
  const orderedIdsOverMultipleRuns = times(10).map(i => {
    seed(`seed ${i}`, {global: true});

    const storage: Object = new MockStorage();
    const o = new OrderManager(makeOptions(storage));
    o.addItem({
      groupId: 'planets',
      id: 'mercury',
      orderHint: -1,
      value: {v: 'Mercury'}
    });
    o.addItem({
      groupId: 'letters',
      id: 'a',
      orderHint: 0,
      value: {v: `A ${i}`}
    });

    const o2 = new OrderManager(makeOptions(storage));
    o2.addItem({
      groupId: 'letters',
      id: 'a',
      orderHint: 0,
      value: {v: `A ${i}`}
    });
    o2.addItem({
      groupId: 'planets',
      id: 'mercury',
      orderHint: -1,
      value: {v: 'Mercury'}
    });
    expect(o2.getOrderedItems()).toEqual(o.getOrderedItems());

    return o.getOrderedItems().map(x => x.id);
  });
  expect(orderedIdsOverMultipleRuns).toMatchSnapshot();
});

test('orderHint is respected within groups but not across groups', () => {
  const orderedIdsOverMultipleRuns = times(10).map(i => {
    seed(`seed ${i}`, {global: true});

    const storage: Object = new MockStorage();
    const [orderedItems, orderedItems2] = times(2).map(() => {
      const o = new OrderManager(makeOptions(storage));
      o.addItem({
        groupId: 'numbers',
        id: 'two',
        orderHint: 12,
        value: {v: 'Two'}
      });
      o.addItem({
        groupId: 'letters',
        id: 'b',
        orderHint: 1,
        value: {v: 'B'}
      });
      o.addItem({
        groupId: 'planets',
        id: 'mercury',
        orderHint: -1,
        value: {v: 'Mercury'}
      });
      o.addItem({
        groupId: 'planets',
        id: 'venus',
        orderHint: 0,
        value: {v: 'Venus'}
      });
      o.addItem({
        groupId: 'letters',
        id: 'a',
        orderHint: 0,
        value: {v: 'A'}
      });
      o.addItem({
        groupId: 'numbers',
        id: 'zero',
        orderHint: 10,
        value: {v: 'Zero'}
      });
      o.addItem({
        groupId: 'numbers',
        id: 'one',
        orderHint: 11,
        value: {v: 'One'}
      });
      return o.getOrderedItems();
    });

    expect(orderedItems2).toEqual(orderedItems);

    expect(orderedItems.findIndex(x => x.id === 'mercury'))
      .toBe(orderedItems.findIndex(x => x.id === 'venus') - 1);
    expect(orderedItems.findIndex(x => x.id === 'a'))
      .toBe(orderedItems.findIndex(x => x.id === 'b') - 1);
    expect(orderedItems.findIndex(x => x.id === 'zero'))
      .toBe(orderedItems.findIndex(x => x.id === 'one') - 1);
    expect(orderedItems.findIndex(x => x.id === 'one'))
      .toBe(orderedItems.findIndex(x => x.id === 'two') - 1);

    return orderedItems.map(x => x.id);
  });
  expect(orderedIdsOverMultipleRuns).toMatchSnapshot();
});

test('handles orderHint being changed from remembered value', () => {
  times(10).forEach(i => {
    seed(`seed ${i}`, {global: true});

    const storage: Object = new MockStorage();
    const [orderedItems, orderedItems2] = times(2).map(ii => {
      const plutoBeforeNeptune = ii === 0;

      const o = new OrderManager(makeOptions(storage));
      o.addItem({
        groupId: 'letters',
        id: 'b',
        orderHint: 1,
        value: {v: 'B'}
      });
      o.addItem({
        groupId: 'planets',
        id: 'neptune',
        orderHint: 8,
        value: {v: 'Neptune'}
      });
      o.addItem({
        groupId: 'planets',
        id: 'pluto',
        orderHint: plutoBeforeNeptune ? 7.9 : 9,
        value: {v: 'Pluto'}
      });
      o.addItem({
        groupId: 'letters',
        id: 'a',
        orderHint: 0,
        value: {v: 'A'}
      });

      const orderedItems = o.getOrderedItems();
      expect(orderedItems.findIndex(x => x.id === 'a'))
        .toBe(orderedItems.findIndex(x => x.id === 'b') - 1);
      if (plutoBeforeNeptune) {
        expect(orderedItems.findIndex(x => x.id === 'pluto'))
          .toBe(orderedItems.findIndex(x => x.id === 'neptune') - 1);
      } else {
        expect(orderedItems.findIndex(x => x.id === 'neptune'))
          .toBe(orderedItems.findIndex(x => x.id === 'pluto') - 1);
      }
      return orderedItems;
    });

    expect(orderedItems.findIndex(x => x.id === 'a'))
      .toBe(orderedItems2.findIndex(x => x.id === 'a'));
    expect(orderedItems.findIndex(x => x.id === 'b'))
      .toBe(orderedItems2.findIndex(x => x.id === 'b'));
    expect(orderedItems.findIndex(x => x.id === 'neptune'))
      .toBe(orderedItems2.findIndex(x => x.id === 'pluto'));
    expect(orderedItems.findIndex(x => x.id === 'pluto'))
      .toBe(orderedItems2.findIndex(x => x.id === 'neptune'));
  });
});

test('moveItem works', () => {
  const storage: Object = new MockStorage();
  function addItems(o) {
    o.addItem({
      groupId: 'numbers',
      id: 'one',
      orderHint: 1,
      value: {v: 'one'}
    });
    o.addItem({
      groupId: 'numbers',
      id: 'two',
      orderHint: 2,
      value: {v: 'two'}
    });
    o.addItem({
      groupId: 'numbers',
      id: 'three',
      orderHint: 3,
      value: {v: 'three'}
    });
  }

  {
    const o = new OrderManager(makeOptions(storage));
    addItems(o);
    expect(o.getOrderedItems().map(i => i.id)).toEqual(['one', 'two', 'three']);
    o.moveItem(1, 0);
    expect(o.getOrderedItems().map(i => i.id)).toEqual(['two', 'one', 'three']);
  }
  {
    const o = new OrderManager(makeOptions(storage));
    addItems(o);
    expect(o.getOrderedItems().map(i => i.id)).toEqual(['two', 'one', 'three']);
    o.moveItem(1, 0);
    expect(o.getOrderedItems().map(i => i.id)).toEqual(['one', 'two', 'three']);
  }
  {
    const o = new OrderManager(makeOptions(storage));
    addItems(o);
    expect(o.getOrderedItems().map(i => i.id)).toEqual(['one', 'two', 'three']);
    o.moveItem(0, 1);
    expect(o.getOrderedItems().map(i => i.id)).toEqual(['two', 'one', 'three']);
  }
  {
    const o = new OrderManager(makeOptions(storage));
    addItems(o);
    expect(o.getOrderedItems().map(i => i.id)).toEqual(['two', 'one', 'three']);
    o.moveItem(2, 1);
    expect(o.getOrderedItems().map(i => i.id)).toEqual(['two', 'three', 'one']);
  }
  {
    const o = new OrderManager(makeOptions(storage));
    addItems(o);
    expect(o.getOrderedItems().map(i => i.id)).toEqual(['two', 'three', 'one']);
    o.moveItem(0, 2);
    expect(o.getOrderedItems().map(i => i.id)).toEqual(['three', 'one', 'two']);
  }
});