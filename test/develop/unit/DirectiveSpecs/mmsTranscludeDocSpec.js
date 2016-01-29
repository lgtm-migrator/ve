'use strict';

describe('mmsTranscludeDoc directive', function() {
    var scope; //scope when directive is called
    var element; //dom element mms-transclude-name

    beforeEach(module('mms.directives'));

    beforeEach(inject(function($rootScope, $compile, $injector, UtilsService, CacheService) {
        //CacheService = $injector.get('CacheService');
        scope = $rootScope.$new();
        var testElement = {
            sysmlid: 'viewId',
            name: 'blah',
            documentation: 'documentation and <mms-transclude-name mms-eid="viewId"></mms-transclude-name>',
            specialization: {
                type: 'Element'
            }
        };
        var cacheKey = UtilsService.makeElementKey(testElement.sysmlid, 'master', 'latest', false);
        CacheService.put(cacheKey, testElement);
        scope.view = testElement;
        element = angular.element('<mms-transclude-doc data-mms-eid="{{view.sysmlid}}"></mms-transclude-doc>');
        $compile(element)(scope);
        scope.$digest();
    }));

    it('mmsTranscludeDoc.nominal()', inject(function() {
        expect(element.html()).toContain('documentation');
        expect(element.html()).toContain('blah'); //test recursive compilation
    }));
});