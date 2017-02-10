'use strict';

/* Controllers */

angular.module('mmsApp')
.controller('ToolbarCtrl', ['$scope', '$rootScope', '$state', 'UxService', 'refOb', 'documentOb', 
function($scope, $rootScope, $state, UxService, refOb, documentOb) {

    var tbApi = {};
    $scope.tbApi = tbApi;
    $scope.buttons = [];

    // TODO: Manage rootScope in controllers, for now set/get in one area of the code
    // Set MMS $rootScope variables
    $rootScope.ve_tbApi = tbApi;

    tbApi.init = function()
    {
        tbApi.addButton(UxService.getToolbarButton("element-viewer"));
        tbApi.addButton(UxService.getToolbarButton("element-editor"));
        if ($rootScope.ve_edits && Object.keys($rootScope.ve_edits).length > 0) {
            tbApi.setIcon('element-editor', 'fa-edit-asterisk');
            tbApi.setPermission('element-editor-saveall', true);
        }
        var editable = false;
        tbApi.addButton(UxService.getToolbarButton("element-history"));
        if ($state.includes('project.ref.document')) {
            tbApi.addButton(UxService.getToolbarButton("jobs"));
        }
        /*if ($state.includes('workspace.diff'))
        {
            tbApi.addButton(UxService.getToolbarButton("diff-perspective-detail"));
            tbApi.addButton(UxService.getToolbarButton("diff-perspective-tree"));
            
            tbApi.setOptions('element-viewer', {
                active: false
            });
            tbApi.setPermission('element-history', false);
        }
        else*/ if ($state.includes('project.ref') && !$state.includes('project.ref.document')) {
            editable = documentOb && !refOb.isTag;
            tbApi.setPermission('element-editor', editable);
            tbApi.addButton(UxService.getToolbarButton("tags"));
            tbApi.setPermission('tags', true);
            if ($state.includes('project.ref.preview')) {
                tbApi.addButton(UxService.getToolbarButton("view-reorder"));
                tbApi.setPermission("view-reorder", editable);
            }
        } else if ($state.includes('project.ref.document')) {
            editable = documentOb._editable && !refOb.isTag;
            tbApi.addButton(UxService.getToolbarButton("document-snapshot"));
            tbApi.addButton(UxService.getToolbarButton("view-reorder"));
            tbApi.setPermission('element-editor', editable);
            tbApi.setPermission('document-snapshot-create', editable);
            tbApi.setPermission("view-reorder", editable);
        }
    };
}]);