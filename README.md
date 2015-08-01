unblocking-helpers
============================

## TL;DR

Offload parts of the heavy UI rendering process to an animation frame with asynced (and optionally throttled) processing to significantly speed up the user experience.

## Why bother?

Every time you render a template, the UI is blocked until the render completes. If you have an `{{#each}}` block in your template (and then possibly another one inside) the render process might take a considerable amount of time.

This has become more problematic in our complex production app. On slower devices like old iPads sometimes the UI would be blocked for seconds leaving the poor user wondering what's going on.

Unblocking helpers make the rendering process much more responsive. The render process will unblock every time it hits a helper. This will cut the long process into separate smaller pieces.

This means it renders every level of nested `{{#eaches}}` separately

The throttled version of the helpers take this a step further. They feed your client-side, template-level subscriptions in an iterative manner, ensuring that the UI renders in chunks as the data is shipped to the `{{each}}` helper in manageable chunks of data rather than as a steady stream, unblocking the UI along the way.

You can actually observe the chunks rendering one after another in your browser. This is unfortunately not the case when you iterate over either
 a) something that you subscribed to earlier, or
 b) simple array.

So, the throttled option means - render every iteration of each separately, unblocking in-between.

## Install

Not released yet, for now please clone the repository and put it in your project packages folder.

(soon) Install using Meteor:

```sh
$ meteor add lgandecki:unblocking-helpers
```


## Usage

Simply move your existing helpers to one of two objects:

```javascript
Template.slow_template.unblockingHelpers = {
	helperUsedInEachBlock: function() {
		return []
	},
	anotherHelper: function() {
		return BigCollection.find({});
	}
};

Template.slow_template.unblockingHelpersThrottled = {
	helperUsedInEachBlockReturningBigArray: function() {
		return EvenBiggerCollection.find().fetch()
	}
}; 
```

And then register the helpers:
```javascript
RegisterUnblockingHelpersFor(Template.slow_template);
```

## Limitations of the throttled option

You can't return a cursor. Do `.fetch()`. Basically, the helper has to return an array, so the function can split it and pass in chunks.

Everything depending on a throttled helper will rerender everytime reactivity for it kicks in.. (in opposition to adding/removing/updating only the changes).
 
This might sound like a big issue and it could be taken care of by some diffing mechanism. But, that would add a ton of complexity. Nonetheless it all depends on what you are trying to achieve. Throttled option should be great for big loops that are at the most outer layer of your template. For throttled version I would recommend using either non-reactive queries, static arrays, or queries with limited fields - maybe you just need to have _ids and names to iterate over something. If you set it up properly the throttled helper should almost never reload. And if it does reload once in a blue moon? Well. It shouldn't be a huge issue anyway, it will still be less intrusive than page reload. The cost will be small, but the advantage in terms of UX will be huge. 
  
## Credits

Thanks to hpx7 for his meteor-async-template-helpers that inspired me to work on this package. 
