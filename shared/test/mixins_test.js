/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop, sinon */
/* jshint newcap:false */

var expect = chai.expect;

describe("loop.shared.mixins", function() {
  "use strict";

  var sandbox;
  var sharedMixins = loop.shared.mixins;
  var ROOM_STATES = loop.store.ROOM_STATES;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
    sharedMixins.setRootObject(window);
  });

  describe("loop.shared.mixins.UrlHashChangeMixin", function() {
    function createTestComponent(onUrlHashChange) {
      var TestComp = React.createClass({
        mixins: [loop.shared.mixins.UrlHashChangeMixin],
        onUrlHashChange: onUrlHashChange || function(){},
        render: function() {
          return React.DOM.div();
        }
      });
      return new React.createElement(TestComp);
    }

    it("should watch for hashchange event", function() {
      var addEventListener = sandbox.spy();
      sharedMixins.setRootObject({
        addEventListener: addEventListener
      });

      TestUtils.renderIntoDocument(createTestComponent());

      sinon.assert.calledOnce(addEventListener);
      sinon.assert.calledWith(addEventListener, "hashchange");
    });

    it("should call onUrlHashChange when the url is updated", function() {
      sharedMixins.setRootObject({
        addEventListener: function(name, cb) {
          if (name === "hashchange") {
            cb();
          }
        }
      });
      var onUrlHashChange = sandbox.stub();

      TestUtils.renderIntoDocument(createTestComponent(onUrlHashChange));

      sinon.assert.calledOnce(onUrlHashChange);
    });
  });

  describe("loop.shared.mixins.DocumentLocationMixin", function() {
    var reloadStub, TestComp;

    beforeEach(function() {
      reloadStub = sandbox.stub();

      sharedMixins.setRootObject({
        location: {
          reload: reloadStub
        }
      });

      TestComp = React.createClass({
        mixins: [loop.shared.mixins.DocumentLocationMixin],
        render: function() {
          return React.DOM.div();
        }
      });
    });

    it("should call window.location.reload", function() {
      var comp = TestUtils.renderIntoDocument(React.createElement(TestComp));

      comp.locationReload();

      sinon.assert.calledOnce(reloadStub);
    });
  });

  describe("loop.shared.mixins.DocumentTitleMixin", function() {
    var TestComp, rootObject;

    beforeEach(function() {
      rootObject = {
        document: {}
      };
      sharedMixins.setRootObject(rootObject);

      TestComp = React.createClass({
        mixins: [loop.shared.mixins.DocumentTitleMixin],
        render: function() {
          return React.DOM.div();
        }
      });
    });

    it("should set window.document.title", function() {
      var comp = TestUtils.renderIntoDocument(React.createElement(TestComp));

      comp.setTitle("It's a Fake!");

      expect(rootObject.document.title).eql("It's a Fake!");
    });
  });


  describe("loop.shared.mixins.WindowCloseMixin", function() {
    var TestComp, rootObject;

    beforeEach(function() {
      rootObject = {
        close: sandbox.stub()
      };
      sharedMixins.setRootObject(rootObject);

      TestComp = React.createClass({
        mixins: [loop.shared.mixins.WindowCloseMixin],
        render: function() {
          return React.DOM.div();
        }
      });
    });

    it("should call window.close", function() {
      var comp = TestUtils.renderIntoDocument(React.createElement(TestComp));

      comp.closeWindow();

      sinon.assert.calledOnce(rootObject.close);
      sinon.assert.calledWithExactly(rootObject.close);
    });
  });

  describe("loop.shared.mixins.DocumentVisibilityMixin", function() {
    var comp, TestComp, onDocumentVisibleStub, onDocumentHiddenStub;

    beforeEach(function() {
      onDocumentVisibleStub = sandbox.stub();
      onDocumentHiddenStub = sandbox.stub();

      TestComp = React.createClass({
        mixins: [loop.shared.mixins.DocumentVisibilityMixin],
        onDocumentHidden: onDocumentHiddenStub,
        onDocumentVisible: onDocumentVisibleStub,
        render: function() {
          return React.DOM.div();
        }
      });
    });

    function setupFakeVisibilityEventDispatcher(event) {
      loop.shared.mixins.setRootObject({
        document: {
          addEventListener: function(_, fn) {
            fn(event);
          },
          removeEventListener: sandbox.stub()
        }
      });
    }

    it("should call onDocumentVisible when document visibility changes to visible",
      function() {
        setupFakeVisibilityEventDispatcher({target: {hidden: false}});

        comp = TestUtils.renderIntoDocument(React.createElement(TestComp));

        sinon.assert.calledOnce(onDocumentVisibleStub);
      });

    it("should call onDocumentVisible when document visibility changes to hidden",
      function() {
        setupFakeVisibilityEventDispatcher({target: {hidden: true}});

        comp = TestUtils.renderIntoDocument(React.createElement(TestComp));

        sinon.assert.calledOnce(onDocumentHiddenStub);
      });
  });

  describe("loop.shared.mixins.MediaSetupMixin", function() {
    var view, TestComp, rootObject;

    beforeEach(function() {
      TestComp = React.createClass({
        mixins: [loop.shared.mixins.MediaSetupMixin],
        render: function() {
          return React.DOM.div();
        }
      });

      sandbox.useFakeTimers();

      rootObject = {
        events: {},
        setTimeout: function(func, timeout) {
          return setTimeout(func, timeout);
        },
        clearTimeout: function(timer) {
          return clearTimeout(timer);
        },
        addEventListener: function(eventName, listener) {
          this.events[eventName] = listener;
        },
        removeEventListener: function(eventName) {
          delete this.events[eventName];
        }
      };

      sharedMixins.setRootObject(rootObject);

      view = TestUtils.renderIntoDocument(React.createElement(TestComp));
    });

    describe("#getDefaultPublisherConfig", function() {
      it("should provide a default publisher configuration", function() {
        var defaultConfig = view.getDefaultPublisherConfig({publishVideo: true});

        expect(defaultConfig.publishVideo).eql(true);
      });
    });

    describe("Events", function() {
      var localElement, remoteElement, screenShareElement;

      beforeEach(function() {
        sandbox.stub(view, "getDOMNode").returns({
          querySelector: function(classSelector) {
            if (classSelector.contains("local")) {
                return localElement;
            } else if (classSelector.contains("screen")) {
                return screenShareElement;
            }
            return remoteElement;
          }
        });
      });

      describe("resize", function() {
        it("should update the width on the local stream element", function() {
          localElement = {
            offsetWidth: 100,
            offsetHeight: 100,
            style: { width: "0%" }
          };

          rootObject.events.resize();
          sandbox.clock.tick(10);

          expect(localElement.style.width).eql("100%");
        });

        it("should update the height on the remote stream element", function() {
          remoteElement = {
            offsetWidth: 100,
            offsetHeight: 100,
            style: { height: "0%" }
          };

          rootObject.events.resize();
          sandbox.clock.tick(10);

          expect(remoteElement.style.height).eql("100%");
        });

        it("should update the height on the screen share stream element", function() {
          screenShareElement = {
            offsetWidth: 100,
            offsetHeight: 100,
            style: { height: "0%" }
          };

          rootObject.events.resize();
          sandbox.clock.tick(10);

          expect(screenShareElement.style.height).eql("100%");
        });
      });

      describe("orientationchange", function() {
        it("should update the width on the local stream element", function() {
          localElement = {
            offsetWidth: 100,
            offsetHeight: 100,
            style: { width: "0%" }
          };

          rootObject.events.orientationchange();
          sandbox.clock.tick(10);

          expect(localElement.style.width).eql("100%");
        });

        it("should update the height on the remote stream element", function() {
          remoteElement = {
            offsetWidth: 100,
            offsetHeight: 100,
            style: { height: "0%" }
          };

          rootObject.events.orientationchange();
          sandbox.clock.tick(10);

          expect(remoteElement.style.height).eql("100%");
        });

        it("should update the height on the screen share stream element", function() {
          screenShareElement = {
            offsetWidth: 100,
            offsetHeight: 100,
            style: { height: "0%" }
          };

          rootObject.events.orientationchange();
          sandbox.clock.tick(10);

          expect(screenShareElement.style.height).eql("100%");
        });
      });


      describe("Video stream dimensions", function() {
        var localVideoDimensions = {
          camera: {
            width: 640,
            height: 480
          }
        };
        var remoteVideoDimensions = {
          camera: {
            width: 420,
            height: 138
          }
        };

        beforeEach(function() {
          view.updateVideoDimensions(localVideoDimensions, remoteVideoDimensions);
        });

        it("should register video dimension updates correctly", function() {
          expect(view._videoDimensionsCache.local.camera.width)
            .eql(localVideoDimensions.camera.width);
          expect(view._videoDimensionsCache.local.camera.height)
            .eql(localVideoDimensions.camera.height);
          expect(view._videoDimensionsCache.local.camera.aspectRatio.width).eql(1);
          expect(view._videoDimensionsCache.local.camera.aspectRatio.height).eql(0.75);
          expect(view._videoDimensionsCache.remote.camera.width)
            .eql(remoteVideoDimensions.camera.width);
          expect(view._videoDimensionsCache.remote.camera.height)
            .eql(remoteVideoDimensions.camera.height);
          expect(view._videoDimensionsCache.remote.camera.aspectRatio.width).eql(1);
          expect(view._videoDimensionsCache.remote.camera.aspectRatio.height)
            .eql(0.32857142857142857);
        });

        it("should fetch remote video stream dimensions correctly", function() {
          remoteElement = {
            offsetWidth: 600,
            offsetHeight: 320
          };

          var remoteVideoDimensions = view.getRemoteVideoDimensions();
          expect(remoteVideoDimensions.width).eql(remoteElement.offsetWidth);
          expect(remoteVideoDimensions.height).eql(remoteElement.offsetHeight);
          expect(remoteVideoDimensions.streamWidth).eql(534.8571428571429);
          expect(remoteVideoDimensions.streamHeight).eql(remoteElement.offsetHeight);
          expect(remoteVideoDimensions.offsetX).eql(32.571428571428555);
          expect(remoteVideoDimensions.offsetY).eql(0);
        });
      });
    });
  });

  describe("loop.shared.mixins.AudioMixin", function() {
    var view, fakeAudio, TestComp;

    beforeEach(function() {
      navigator.mozLoop = {
        doNotDisturb: true,
        getAudioBlob: sinon.spy(function(name, callback) {
          callback(null, new Blob([new ArrayBuffer(10)], {type: 'audio/ogg'}));
        })
      };

      fakeAudio = {
        play: sinon.spy(),
        pause: sinon.spy(),
        removeAttribute: sinon.spy()
      };
      sandbox.stub(window, "Audio").returns(fakeAudio);

      TestComp = React.createClass({
        mixins: [loop.shared.mixins.AudioMixin],
        componentDidMount: function() {
          this.play("failure");
        },
        render: function() {
          return React.DOM.div();
        }
      });

    });

    it("should not play a failure sound when doNotDisturb true", function() {
      view = TestUtils.renderIntoDocument(React.createElement(TestComp));
      sinon.assert.notCalled(navigator.mozLoop.getAudioBlob);
      sinon.assert.notCalled(fakeAudio.play);
    });

    it("should play a failure sound, once", function() {
      navigator.mozLoop.doNotDisturb = false;
      view = TestUtils.renderIntoDocument(React.createElement(TestComp));
      sinon.assert.calledOnce(navigator.mozLoop.getAudioBlob);
      sinon.assert.calledWithExactly(navigator.mozLoop.getAudioBlob,
                                     "failure", sinon.match.func);
      sinon.assert.calledOnce(fakeAudio.play);
      expect(fakeAudio.loop).to.equal(false);
    });
  });

  describe("loop.shared.mixins.RoomsAudioMixin", function() {
    var view, fakeAudioMixin, TestComp, comp;

    function createTestComponent(initialState) {
      var TestComp = React.createClass({
        mixins: [loop.shared.mixins.RoomsAudioMixin],
        render: function() {
          return React.DOM.div();
        },

        getInitialState: function() {
          return { roomState: initialState};
        }
      });

      var renderedComp = TestUtils.renderIntoDocument(
        React.createElement(TestComp));
      sandbox.stub(renderedComp, "play");
      return renderedComp;
    }

    beforeEach(function() {
    });

    it("should play a sound when the local user joins the room", function() {
      comp = createTestComponent(ROOM_STATES.INIT);

      comp.setState({roomState: ROOM_STATES.SESSION_CONNECTED});

      sinon.assert.calledOnce(comp.play);
      sinon.assert.calledWithExactly(comp.play, "room-joined");
    });

    it("should play a sound when another user joins the room", function() {
      comp = createTestComponent(ROOM_STATES.SESSION_CONNECTED);

      comp.setState({roomState: ROOM_STATES.HAS_PARTICIPANTS});

      sinon.assert.calledOnce(comp.play);
      sinon.assert.calledWithExactly(comp.play, "room-joined-in");
    });

    it("should play a sound when another user leaves the room", function() {
      comp = createTestComponent(ROOM_STATES.HAS_PARTICIPANTS);

      comp.setState({roomState: ROOM_STATES.SESSION_CONNECTED});

      sinon.assert.calledOnce(comp.play);
      sinon.assert.calledWithExactly(comp.play, "room-left");
    });

    it("should play a sound when the local user leaves the room", function() {
      comp = createTestComponent(ROOM_STATES.HAS_PARTICIPANTS);

      comp.setState({roomState: ROOM_STATES.READY});

      sinon.assert.calledOnce(comp.play);
      sinon.assert.calledWithExactly(comp.play, "room-left");
    });

    it("should play a sound when if there is a failure", function() {
      comp = createTestComponent(ROOM_STATES.HAS_PARTICIPANTS);

      comp.setState({roomState: ROOM_STATES.FAILED});

      sinon.assert.calledOnce(comp.play);
      sinon.assert.calledWithExactly(comp.play, "failure");
    });

    it("should play a sound when if the room is full", function() {
      comp = createTestComponent(ROOM_STATES.READY);

      comp.setState({roomState: ROOM_STATES.FULL});

      sinon.assert.calledOnce(comp.play);
      sinon.assert.calledWithExactly(comp.play, "failure");
    });
  });
});
