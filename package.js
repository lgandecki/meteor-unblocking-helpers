Package.describe({
  summary: 'Make your helpers unblocking, providing smoother UX',
  version: '0.1.0'
});

Package.onUse(function (api) {
  api.versionsFrom('METEOR@1.0.4');
  api.use(['templating', 'underscore', 'reactive-var', 'dispatch:kernel', 'jparker:crypto-md5'], 'client');
  api.addFiles('unblocking-helpers.js', 'client');

  api.export('RegisterUnblockingHelpersFor', 'client');
});
