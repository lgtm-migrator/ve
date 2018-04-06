'use strict';

angular.module('mms.directives')
.directive('mmsSearch', ['CacheService', 'ElementService', 'ProjectService', 'UtilsService', '_', 'growl', '$templateCache', '$timeout', mmsSearch]);

/**
 * @ngdoc directive
 * @name mms.directives.directive:mmsSearch
 *
 * @restrict E
 *
 * @description
 * TBA
 * 
 * @scope
 *
 */
function mmsSearch(CacheService, ElementService, ProjectService, UtilsService, _, growl, $templateCache, $timeout) {
    var template = $templateCache.get('mms/templates/mmsSearch.html');

    var mmsSearchLink = function(scope, element, attrs) {
        scope.paginationCache = [];
        scope.searchClass = "";
        scope.proposeClass = "";
        scope.filter = '';
        scope.mainSearch = {searchText:'', searchType:{id:'all', label:'All Fields'}, selectedSearchMetatypes: []};
        scope.stringQuery = scope.mainSearch.searchText;
        scope.facet = '$';
        scope.filterQuery = {query: ""};
        scope.currentPage = 0;
        scope.itemsPerPage = 50;
        scope.showSearchResultProps = false;
        scope.switchText = 'More';
        scope.limitForProps = 3;
        scope.advanceSearch = false;
        scope.advanceSearchRows = [];
        scope.docsviews = {
            selected: false
        };
        scope.refId = scope.mmsRefId ? scope.mmsRefId : 'master';

        // Set functions
        ProjectService.getProjectMounts(scope.mmsProjectId, scope.refId); //ensure project mounts object is cached
        // Function used to get string value of metatype names for advanced search
        var getMetatypeSelection = function(id) {
            var mainElement = angular.element(id);
            return mainElement.find('div').attr('value');
        };

        // Get metatypes for dropdown options
        var getMetaTypes = function() {
            scope.metatypeSearch = "fa fa-spin fa-spinner";
            ProjectService.getMetatypes(scope.mmsProjectId, scope.refId)
            .then(function(data) {
                // cache metatypes
                scope.metatypeList = data;
            }, function(reason) {
                growl.error("Search Error: " + reason.message);
            }).finally(function() {
                scope.metatypeSearch = "";
            });
        };
        getMetaTypes();

        // Set search options
        scope.fieldTypeList = [
            { id:'all', label:'All Fields' },
            { id:'name', label:'Name' },
            { id:'documentation', label:'Documentation' },
            { id:'value', label:'Value' },
            { id:'id', label:'ID' },
            { id:'metatype', label:'Metatype' }
        ];

        scope.operatorList = ['And', 'Or', 'And Not'];

        // settings for multiselect metatype dropdown
        scope.metatypeSettings = {
            scrollableHeight: '300px',
            scrollable: true,
            enableSearch: true,
            displayProp: 'name',
            showCheckAll: false,
            smartButtonMaxItems: 10,
            buttonClasses: ''
        };

        // event handler for multiselect metatype dropdown
        scope.multiselectEvent = {
            onItemSelect: function(ob) {
                $timeout( function(){
                    scope.stringQueryUpdate();
                }, 500 );
            },
            onItemDeselect: function(ob) {
                $timeout( function(){
                    scope.stringQueryUpdate();
                }, 500 );
            },
            onDeselectAll: function(ob) {
                $timeout( function(){
                    scope.stringQueryUpdate();
                }, 500 );
            }
        };


        // Watch function - TODO might not need first one
        scope.$watchGroup(['filterQuery.query', 'facet'], function(newVal, oldVal) {
            scope.resultFilter = {};
            scope.resultFilter[scope.facet] = scope.filterQuery.query;
        });
        scope.$watch('searchResults', function(newVal) {
            if (!newVal)
                return;
            if (!scope.mmsOptions.getProperties) {
                return;
            }
            newVal.forEach(function(elem) {
                if (elem._properties) {
                    return;
                }
                // mms does not return properties will need to make a call for the results whose type is Class
                // Call ElementService.getOwnedElements with depth of 2
                // filter out results that have type = to Property and Slot
                // for Property check that ownerId is same as the class id
                if (elem.type === 'Class' || elem.type === 'Component') {
                    var reqOb = {elementId: elem.id, projectId: elem._projectId, refId: elem._refId, depth: 2};
                    ElementService.getOwnedElements(reqOb, 2)
                        .then(function (data) {
                            var properties = [];
                            //TODO might not be elements
                            angular.forEach(data, function (elt) {
                                if (elt.type === 'Property' && elt.ownerId == elem.id) {
                                    properties.push(elt);
                                } else if (elt.type === 'Slot') {
                                    properties.push(elt);
                                }
                            });
                            elem._properties = properties;
                            // OLD CODE - splits into 3cols
                            // if (elem._properties && elem._properties[0]) {
                            //     var properties2 = [];
                            //     for (var i = 0; i < elem._properties.length; i++) {
                            //         if (i % 3 === 0) {
                            //             properties2.push([]);
                            //         }
                            //         properties2[properties2.length - 1].push(elem._properties[i]);
                            //     }
                            //     elem._properties2 = properties2;
                            // }
                        });
                }
            });
        });


        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSearch#stringQueryUpdate
         * @methodOf mms.directives.directive:mmsSearch
         *
         * @description
         * Updates advanced search main query input
         */
        scope.stringQueryUpdate = function() {
            var metatypeFilterString;
            var rowLength = scope.advanceSearchRows.length;
            scope.stringQuery = Array(rowLength+1).join('(');
            scope.stringQuery += scope.mainSearch.searchType.label + ':';
            if (scope.mainSearch.searchType.id === 'metatype') {
                scope.stringQuery += getMetatypeSelection('#searchMetatypeSelect');
            } else {
                scope.stringQuery += scope.mainSearch.searchText;
            }
            for ( var i = 0; i < rowLength; i++) {
                scope.stringQuery += ' ' + scope.advanceSearchRows[i].operator.toUpperCase() + ' ' + scope.advanceSearchRows[i].searchType.label + ':';
                if (scope.advanceSearchRows[i].searchType.id === 'metatype') {
                    scope.stringQuery += getMetatypeSelection('#searchMetatypeSelect-'+i) + ')';
                } else {
                    scope.stringQuery += scope.advanceSearchRows[i].searchText + ')';
                }
            }
        };

         /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSearch#addAdvanceSearchRow
         * @methodOf mms.directives.directive:mmsSearch
         *
         * @description
         * Adds new row with empty fields and updates advanced search main query input
         */
        scope.addAdvanceSearchRow = function() {
            scope.advanceSearchRows.push({operator:'And',searchType:{id:'all', label:'All Fields'},searchText:'',selectedSearchMetatypes:[]});
            scope.stringQueryUpdate();
        };
        scope.addAdvanceSearchRow(); // Second row created by default

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSearch#removeRowAdvanceSearch
         * @methodOf mms.directives.directive:mmsSearch
         *
         * @description
         * Removes selected row and updates advanced search main query input
         *
         * @param {objecy} row advanced search row
         */
        scope.removeRowAdvanceSearch = function(row) {
            scope.advanceSearchRows = _.without(scope.advanceSearchRows, row);
            scope.stringQueryUpdate();
        };

        scope.modifyAdvanceSearch = function() {
            scope.advanceSearch = !scope.advanceSearch;
            scope.advancedSearchResults = !scope.advancedSearchResults;
        };

        scope.nextPage = function() {
            if (scope.paginationCache[scope.currentPage+1]) {
                scope.searchResults= scope.paginationCache[scope.currentPage+1];
                scope.currentPage += 1;
            } else{
                scope.search(scope.mainSearch, scope.currentPage + 1, scope.itemsPerPage);
            }
        };

        scope.prevPage = function() {
            if (scope.paginationCache[scope.currentPage-1]) {
                scope.searchResults= scope.paginationCache[scope.currentPage-1];
                scope.currentPage -= 1;
            } else {
                scope.search(scope.mainSearch, scope.currentPage - 1, scope.itemsPerPage);
            }
        };

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSearch#setFilterFacet
         * @methodOf mms.directives.directive:mmsSearch
         *
         * @description
         * Activate selected filter facet button and use angularJS built-in filter component to filter
         * on search results. Use object expression to filter based on filter type.
         *
         * @param {string} filterFacet filter facet type i.e. all, name, id
         */
        scope.setFilterFacet = function(filterFacet) {
            if (filterFacet === 'all') {
                scope.facet = '$';
            } else {
                scope.facet = filterFacet;
            }
            angular.element('.search-filter-type button').removeClass('active');
            angular.element('.btn-filter-facet-' + filterFacet).addClass('active');
        };

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSearch#search
         * @methodOf mms.directives.directive:mmsSearch
         *
         * @description
         * Call ElementService to make search post and get search results. Check for filterCallback
         * to further filter search results. Reassign pagination variables.
         *
         * @param {object} query search type and keyword from user input
         * @param {number} page page number of search results
         * @param {number} numItems number of items to return per page
         */
        scope.search = function(query, page, numItems) {
            scope.searchClass = "fa fa-spin fa-spinner";
            var queryOb = buildQuery(query);
            queryOb.from = page*numItems + page;
            queryOb.size = numItems;
            var reqOb = {projectId: scope.mmsProjectId, refId: scope.refId};
            ElementService.search(reqOb, queryOb, 2)
            .then(function(data) {
                if (scope.mmsOptions.filterCallback) {
                  scope.searchResults = scope.mmsOptions.filterCallback(data);
                } else {
                  scope.searchResults = data;
                }
                scope.searchClass = "";
                scope.currentPage = page;
                scope.paginationCache.push(scope.searchResults);
                if (scope.advanceSearch) {
                    scope.advanceSearch = !scope.advanceSearch;
                    scope.advancedSearchResults = true;
                }
            }, function(reason) {
                growl.error("Search Error: " + reason.message);
                scope.searchClass = "";
            });
        };

        scope.newSearch = function(query) {
            scope.paginationCache = [];
            scope.search(query, 0, scope.itemsPerPage);
        };

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSearch#getProjectMountsQuery
         * @methodOf mms.directives.directive:mmsSearch
         *
         * @description
         * Create a JSON object that returns a term key with a list of all mounted
         * project ids within the current project. Elastic format
         *
         * @return {object} Elastic query JSON object with list of project mounts
         */
        // TODO cache results
        var getProjectMountsQuery = function () {
            var projList = [];
            var projectTermsOb = {};
            var cacheKey = ['project', scope.mmsProjectId, scope.refId];
            var cachedProj = CacheService.get(cacheKey);
            if (cachedProj) {
                getAllMountsAsArray(cachedProj, projList);
            }
            var q = {};
            if ( projList.length === 0 ) {
                projList.push({
                    bool: {
                        must: [
                            {
                                term: {
                                    _projectId: scope.mmsProjectId
                                }
                            }, {
                                term:{
                                    _inRefIds: scope.refId
                                }
                            }
                        ]
                    }
                });
            }
            q._projectId = projList;
            projectTermsOb.bool = {should: projList};
            return projectTermsOb;
        };

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSearch#getAllMountsAsArray
         * @methodOf mms.directives.directive:mmsSearch
         *
         * @description
         * Use projectsList to populate list with all the mounted project ids for
         * specified project.
         *
         */
        var getAllMountsAsArray = function(project, projectsList) {
            projectsList.push({
                    bool: {
                        must: [
                            {
                                term: {
                                    _projectId: project.id
                                }
                            }, {
                                term:{
                                    _inRefIds: project._refId
                                }
                            }
                        ]
                    }
                });
            var mounts = project._mounts;
            if ( angular.isArray(mounts) && mounts.length !== 0 ) {
                for (var i = 0; i < mounts.length; i++) {
                    if (mounts[i]._mounts) {
                        getAllMountsAsArray(mounts[i], projectsList);
                    }
                }
            }
            return;
        };

        var buildSearchClause = function(query) {
            var clause = {};
            var q = {};
            var valueSearchFields = ["defaultValue.value^3", "value.value^3", "specification.value^3"];
            if (query.searchType.id === 'all') {
                // Set query term for ID
                var idQuery = {};
                idQuery.term = {"id": {"value": query.searchText, "boost": 10.0}};

                // Set query for value,doc,name fields
                var allQuery = {};
                q.query = query.searchText;
                q.fields = valueSearchFields.slice();
                q.fields.push('name^5', 'documentation');
                q.fuzziness = 'AUTO';
                allQuery.multi_match = q;
                clause = {
                    "bool": {
                        "should": [
                            idQuery,
                            allQuery
                        ]
                    }
                };
            } else if (query.searchType.id === 'name' || query.searchType.id === 'documentation') {
                // "{"query":{"bool":{"must":[{"match":{"name":"val"}}]}}}"
                // "{"query":{"bool":{"must":[{"match":{"documentation":"val"}}]}}}"
                var type = query.searchType.id;
                q[type] = query.searchText;
                q.fuzziness = 'AUTO';
                clause.match = q;
            } else if (query.searchType.id === 'id') {
                // "{"query":{"bool":{"must":[{"term":{"id":"val"}}]}}}"
                clause.term = {"id": query.searchText};
            } else if (query.searchType.id === 'value') {
                // "{"query":{"bool":{"must":[{"multi_match":{"query":"val","fields":["defaultValue.value","value.value","specification.value"]}}]}}}"
                q.query = query.searchText;
                q.fields = valueSearchFields;
                q.fuzziness = 'AUTO';
                clause.multi_match = q;
            } else if (query.searchType.id === 'metatype') {
                var metatypeFilterList = _.pluck(query.selectedSearchMetatypes, 'id');

                // Get all _appliedStereotypeIds, which have `_`
                var appliedStereotypeFilter = [], typeFilter = [];
                for (var i = 0; i < metatypeFilterList.length; i++) {
                    //if underscore = appliedsterortype otherwise 'type'
                    if ( metatypeFilterList[i].includes('_') ) {
                        console.log(metatypeFilterList[i]);
                        appliedStereotypeFilter.push(metatypeFilterList[i]);
                    } else {
                        typeFilter.push(metatypeFilterList[i]);
                    }
                }

                // metatype clause
                clause = {
                    "bool": {
                        "should": [
                            {
                                "terms": {
                                    "_appliedStereotypeIds": appliedStereotypeFilter
                                }
                            },
                            {
                                "terms": {
                                    "type": typeFilter
                                }
                            }
                        ],
                        "minimum_should_match": 1
                    }
                };
            }
            return clause;
        };

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSearch#buildQuery
         * @methodOf mms.directives.directive:mmsSearch
         *
         * @description
         * Build JSON object for Elastic query.
         *
         *
         * @return {object} {{query: {bool: {must: *[]}}}} JSON object from post data.
         */
        var buildQuery = function (query) {
            // Set project and mounted projects filter
            var projectTermsOb = getProjectMountsQuery();
            var filterList = [projectTermsOb];

            // Set custom filter options for query
            if (scope.mmsOptions.filterQueryList) {
                angular.forEach(scope.mmsOptions.filterQueryList, function(filterOb){
                    filterList.push(filterOb());
                });
            }

            // Set filter for all views and docs, if selected
            if (scope.docsviews.selected) {
                var viewsAndDocs = {
                    terms : {'_appliedStereotypeIds': [UtilsService.VIEW_SID, UtilsService.DOCUMENT_SID].concat(UtilsService.OTHER_VIEW_SID)}
                };
                filterList.push(viewsAndDocs);
            }

            // Set main query
            var mainBoolQuery = {};
            var jsonQueryOb = {};
            var rowLength = scope.advanceSearchRows.length;
            if (!scope.advanceSearch || rowLength === 0) {
                mainBoolQuery = buildSearchClause(query);
                mainBoolQuery = { "bool": {
                        "must": mainBoolQuery,
                    } };
            } else {
                var boolQuery, clause2;
                var clause1 = buildSearchClause(scope.mainSearch);

                for (var i = 0; i < rowLength; i++) {
                    // if must, must_not or should
                    var row = scope.advanceSearchRows[i];
                    var operator = row.operator;
                    clause2 = buildSearchClause(row);
                    if (operator === "And") {
                        clause1 = { "bool": { "must": [ clause1, clause2 ] } };
                    } else if (operator === "Or") {
                        clause1 = { "bool": { "should": [ clause1, clause2 ],
                                    "minimum_should_match": 1 } };
                    } else if (operator === "And Not") {
                        clause1 = { "bool": { "must": [ clause1, { "bool": {"must_not": clause2} } ] } };
                    }
                }
                mainBoolQuery = clause1;
            }

            jsonQueryOb = {
                "sort" : [
                    "_score",
                    { "_modified" : {"order" : "desc"}}
                ],
                "query": { }
            };
            jsonQueryOb.query = mainBoolQuery;
            jsonQueryOb.query.bool.filter = filterList;
            return jsonQueryOb;
        };


        // Set options
        if (scope.mmsOptions.searchResult) {
            var data1 = scope.mmsOptions.searchResult;
            scope.searchResults = data1;
            scope.paginationCache.push(data1);
        }
        if (scope.mmsOptions.searchInput) {
            scope.mainSearch.searchText = scope.mmsOptions.searchInput;
            scope.newSearch(scope.mainSearch);
        }
        if (scope.mmsOptions.itemsPerPage) {
            scope.itemsPerPage = scope.mmsOptions.itemsPerPage;
        }
        scope.emptyDocTxt = scope.mmsOptions.emptyDocTxt;
        scope.userResultClick = function(elem, property) {
            if (scope.mmsOptions.callback) {
                scope.mmsOptions.callback(elem, property);
            }
        };
        scope.userRelatedClick = function(event, doc, view, elem) {
            event.preventDefault();
            event.stopPropagation();
            if (scope.mmsOptions.relatedCallback)
                scope.mmsOptions.relatedCallback(doc, view, elem);
        };
    };


    return {
        restrict: 'E',
        template: template,
        link: mmsSearchLink,
        scope: {
            mmsOptions: '<',
            mmsProjectId: '@',
            mmsRefId: '@'
        }
    };
}