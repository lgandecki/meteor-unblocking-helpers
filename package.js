"use strict";

Package.describe({
  name: 'lgandecki:unblocking-helpers',
  version: '0.2.0',
  summary: 'Make your helpers unblocking, providing smoother UX',
  git: 'https://github.com/lgandecki/meteor-unblocking-helpers',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0.4');
  api.use(['templating', 'underscore', 'reactive-var', 'jparker:crypto-md5@0.1.1'], 'client');
  api.addFiles('unblocking-helpers.js', 'client');

  api.export('RegisterUnblockingHelpersFor', 'client');
});
