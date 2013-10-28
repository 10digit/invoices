angular.module('10digit.invoices', ['10digit.utils', '10digit.services', 'ngGrid'])

.factory('Invoices',['$rootScope', '$ajax', 'Services', function($rootScope, $ajax, Services){
    var invoiceItemObj = {amount: 0, description: ''}
    var invoiceObj = {items: [invoiceItemObj], total: 0}
    var invoices = [];
    var prices = {};
    var pricesDownloaded = false;
    $ajax.run('settings', {
        success: function(data){
            prices = data;
            pricesDownloaded = true;
            $rootScope.$broadcast('prices_downloaded');
        }
    });

    var getPrice = function(sid, type){
        var price = {};
        if(sid == Services.constants.park){
            price.monthly = prices['price_parking_monthly'];
            price.setup = prices['price_parking_setup'];
        } else if(sid == Services.constants.forward){
            if(type == 'personal'){
                price.monthly = prices['price_forward_monthly'];
                price.setup = prices['price_forward_setup'];
            } else if(type == 'business'){
                price.monthly = prices['price_forward_monthly_business'];
                price.setup = prices['price_forward_setup_business'];
            } else if(type == 'toll free'){
                price.monthly = prices['price_forward_monthly_toll_free'];
                price.setup = prices['price_forward_setup_toll_free'];
            }
        }
        return price;
    }

    return {
        invoices: invoices,
        addInvoice: function(){ invoices.push(invoiceObj)},
        getInvoiceTotal: function(invoice){
            var total = 0;
            for(var i=0;i<invoice.items.length;i++){
                total = total + invoice.items[i].amount;
            }
            return total;
        },
        getPrice: function(sid, type){
            return getPrice(sid, type);
        },
        ready: function(){
            return pricesDownloaded;
        },
	    loadPrevious: function(){
			$ajax.run('members/me/invoices', {
				success: function(res, status){
                    for(var i=0;i<res.length;i++){
                        invoices.push(res[i]);
                    }
				}
			});
	    },
	    next: function(){
			var invoice = {};

		    var makeInvoice = function(services){
			    invoice.amount = 0;
			    invoice.items = [];

			    for(var i=0;i<services.length;i++){
				    var s = services[i];
				    var price = getPrice(s.service, s.type);
				    s.number = s.number ? s.number : 'New Number';
				    if(s.signup){
					    invoice.items.push({description: 'Setup fee for ' + s.number, amount: price.setup});
				    }
				    invoice.items.push({description: 'Monthly fee for ' + s.number, amount: price.monthly});
				    invoice.amount = parseInt(invoice.amount) + parseInt(price.monthly);
				    if(s.signup){
					    invoice.amount = parseInt(invoice.amount) + parseInt(price.setup);
				    }
			    }
		    }

		    /*
		     *   We want to make sure invoice is initialized no matter what
		     */
		    $rootScope.$on('services_changed', function(event){
			    if(pricesDownloaded){
				    makeInvoice(Services.services);
			    }
		    });

		    if(!pricesDownloaded){
			    $rootScope.$on('prices_downloaded', function(event){
				    makeInvoice(Services.services);
			    });
		    } else {
			    makeInvoice(Services.services);
		    }

		    return invoice;
	    }
    }
}])

.controller('PreviousInvoicesCtrl', ['$scope', '$attrs', 'Invoices', function($scope, $attrs, Invoices){
	Invoices.loadPrevious();
    $scope.invoices = Invoices.invoices;
    $scope.$watch('invoices', function(val){
    });
}])

.controller('NextInvoiceCtrl', ['$scope', 'Invoices', function($scope, Invoices){
	$scope.invoice = Invoices.next();
}])

.controller('InvoiceLineCtrl', ['$scope', '$attrs', function($scope, $attrs){
}])

.directive('previousInvoices', function(){
	return {
		restrict:'E',
		controller:'PreviousInvoicesCtrl',
        templateUrl: 'template/10digit/invoices.html'
	}
})
.directive('nextInvoice', function () {
	return {
		restrict:'E',
		controller:'NextInvoiceCtrl',
		transclude: true,
		replace: false,
		templateUrl: 'template/10digit/invoice.html'
	};
});
