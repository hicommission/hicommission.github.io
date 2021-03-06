/* Author:
*  Addressbook in Backbone.js
*  codef0rmer <amit.2006.it@gmail.com>
*  http://amitgharat.wordpress.com/2012/06/23/writing-your-first-application-using-backbone-js/
*/
var AB = {
    run: function () {
        this.addview = new this.addView();
        this.addjudahview = new this.addJudahView();
        this.addmeview = new this.addMeView();
        this.listview = new this.listView();
        this.searchview = new this.searchView();
        this.contactscollection = new AB.contactsCollection();
        this.router = new this.Router();
        Backbone.history.start();
        //this.router.navigate('add_new_contact', {trigger: true});		
        this.router.navigate('add_judah', {trigger: true});
        //this.router.navigate('add_me', {trigger: true});
    }
};

AB.Router = Backbone.Router.extend({
    routes: {
        'list_contacts': 	'renderListContactsPage', 
        'add_new_contact': 	'renderAddNewContactPage',
        'add_judah': 'renderAddNewJudahPage',
        'add_me': 'renderAddNewMePage',
        'search_contacts': 	'renderSearchContactsPage', 
        'edit_contact/:id': 'renderEditContactPage'		
    }, 

    renderAddNewContactPage: function () {
        AB.addview.addContactPage();
    }, 
    
    renderAddNewJudahPage: function () {
        AB.addjudahview.addJudahPage();
    }, 
    
    renderAddNewMePage: function(){
       AB.addmeview.setElement('div.abPanel'); 
       AB.addmeview.addMePage();    
    },
    
    renderListContactsPage: function () {
        AB.listview.setElement('div.abPanel');
        AB.listview.listContactsPage();
    }, 

    renderSearchContactsPage: function () {
        AB.searchview.searchContactsPage();
    }, 

    renderEditContactPage: function (id) {
        AB.addview.addContactPage(id);
    }
});

AB.contactModel = Backbone.Model.extend({
    sync: function (method, model, options) {
        if (method === 'create' || method === 'update') {
            return $.ajax({
                dataType: 'json',
                url: '../php/addNewContact.php', 
                data: {
                    id: (this.get('id') || ''), 
                    full_name: (this.get('full_name') || ''), 
                    email: (this.get('email') || ''),
                    phone: (this.get('phone') || ''), 
                    address: (this.get('address') || '')
                }, 
                success: function (data) {					
                    $('span.false').html('');
                    if (data.success === true) {
                        if (method === 'update') {
                            AB.router.navigate('list_contacts', {trigger: true});
                        } else {
                            $('form').get(0).reset();
                        }
                    } else {
                        $.each(data.validationError, function () {
                            $('span.' + this.target).html(this.error);
                        });
                    }
                    $('span.success').html(data.msg).removeClass('false').addClass(data.success.toString());
                }
            });
        } else if (method === 'delete') {
            var id = this.get('id');
            return $.getJSON('../php/deleteContact.php', { id: id }, function (data) {
                if (data.success === true) {
                    $('#contactsGrid tr[data-id="' + id + '"]').hide('slow');
                } else {
                    alert(data.msg);
                }
            });
        }
    }
});

AB.contactsCollection = Backbone.Collection.extend({
    model: AB.contactModel, 	
    url: '../php/listContacts.php'
});

/* addNewContact View */
AB.addView = Backbone.View.extend({
    el: 'div.abPanel', 

    template: _.template($('#addContactTemplate').html()), 
    //template: _.template($('#addJudahTemplate').html()), 

    events: {
        'submit form#frmAddContact': 'addContact'
    }, 

    initialize: function () {
        //_.bindAll(this, 'addContactPage', 'addContact');
        _.bindAll(this, 'addJudahPage', 'addContact');
        //_.bindAll(this, 'addMePage', 'addContact');
    }, 

    addContactPage: function (id) {
        var contact = {},
        model = AB.contactscollection.get(id);

        if (id !== undefined && model !== undefined) {
            contact = model.toJSON();
        }
        this.$el.html(this.template({contact: contact}));
    },

    addContact: function (event) {
        var full_name = $('#full_name').val(), 
            email = $('#email').val(), 
            phone = $('#phone').val(), 
            address = $('#address').val(), 
            id = $('#id').val();

        if (id === '') {
            var contactmodel = new AB.contactModel({
                full_name: full_name, 
                email: email, 
                phone: phone, 
                address: address
            });
        } else {
            var contactmodel = new AB.contactModel({
                id: id, 
                full_name: full_name, 
                email: email, 
                phone: phone, 
                address: address
            });	
        }
        contactmodel.save();
        return false;
    },
    
addJudahPage: function () {
        var contact = {}
    /*    model = AB.contactscollection.get(id);

        if (id !== undefined && model !== undefined) {
            contact = model.toJSON();
        }
        this.$el.html(this.template({contact: contact}));
    },*/
    //this.$el.html(this.template({contact: contact}));    
},

    
addMePage: function () {
        var contact = {}
},

});
     
/* addNewJudah View */
AB.addJudahView = Backbone.View.extend({
    el: 'div.abPanel', 

    template: _.template($('#addJudahTemplate').html()), 

addJudahPage: function () {
        var contact = {}
    /*    model = AB.contactscollection.get(id);

        if (id !== undefined && model !== undefined) {
            contact = model.toJSON();
        }
        this.$el.html(this.template({contact: contact}));
    },*/
        this.$el.html(this.template({contact: contact}));
},
    
});

/* addMe View */
AB.addMeView = Backbone.View.extend({
    el: 'div.abPanel', 
    
    template: _.template($('#addMeTemplate').html()),

addMePage: function () {
        var contact = {}
        this.$el.html(this.template({contact: contact}));
},
    
});


/* listContacts View */
AB.listView = Backbone.View.extend({
    el: 'div.abPanel', 

    template: _.template($('#listContactsTemplate').html()), 

    initialize: function () {
        _.bindAll(this, 'listContactsPage', 'render');
    }, 

    render: function (response) {
        var self = this;

        this.$el.html(this.template({contacts: response}));
        $('#contactsGrid tr[data-id]').each(function () {
            var id = $(this).attr('data-id');			
            $(this).find('a:first').click(function () {
                self.editContact(id);
            });
            $(this).find('a:last').click(function () {
                self.deleteContact(id);
            });
        });
    }, 

    listContactsPage: function (querystring) {
        var self = this;

        AB.contactscollection.fetch({
            data: querystring, 
            success: function (collection, response) {
                self.render(response);
            }
        });
    }, 

    deleteContact: function (id) {
        if (confirm('Are you sure to delete?')) {
            AB.contactscollection.get(id).destroy();
        }		
    }, 

    editContact: function (id) {
        AB.router.navigate('edit_contact/' + id, {trigger: true});
    }
});

/* searchContacts View */
AB.searchView = Backbone.View.extend({
    el: 'div.abPanel', 

    template: _.template($('#searchContactsTemplate').html()), 

    events: {
        'submit form#frmSearchContacts': 'searchContacts'
    },

    initialize: function () {
        _.bindAll(this, 'searchContactsPage', 'searchContacts');
    }, 

    searchContactsPage: function () {
        this.$el.html(this.template);
        AB.listview.setElement('#grid');
        AB.listview.render({});
    }, 

    searchContacts: function (event) {
        var full_name = $('#full_name').val(),
            email = $('#email').val();

        AB.listview.setElement('#grid');
        AB.listview.listContactsPage({full_name: full_name, email: email});
        return false;
    }
});

////////
/*    var Movie = Backbone.Model.extend({
        defaults: function() {
            return {
                name: ""
            };
        }
    });
    //collection
    var Movies = Backbone.Firebase.Collection.extend({
        model: Movie,
        firebase: new Firebase("https://moviefire.firebaseio.com/movies")
    });
    // init collection
    var favMovies = new Movies();

    //view
    var favMovieView = Backbone.View.extend({
        tagName: "li",
        events: {
            "click .delete": "clear",
            "click .edit": "edit",
        },
        initialize: function() {
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'remove', this.remove);
        },
        render: function() {
            this.$el.html(_.template($('#movieTemplate').html().trim(), this.model.toJSON()));
            return this;
        },
        edit: function() {
            var movieName = prompt("Update the movie name", this.model.get('name').trim()); // to keep things simple and old skool :D
            if (movieName && movieName.length > 0) {
                this.model.set({
                    name: movieName
                });
            }
        },
        clear: function() {
            var response = confirm("Are certain about removing \"" + this.model.get('name').trim() + "\" from the list?");
            if (response == true) {
                favMovies.remove(this.model);
            }
        }
    });

    var AppView = Backbone.View.extend({
        el: $("body"),
        events: {
            "keypress #movieName": "saveToList"
        },
        initialize: function() {
            this.input = this.$("#movieName");
            this.listenTo(favMovies, 'add', this.addOne);
        },
        saveToList: function(e) {
            if (e.keyCode != 13) return
            else {
                if (this.input.val().length > 0)
                    favMovies.add({
                        name: this.input.val()
                    });
            }
            this.input.val('');
        },
        addOne: function(movie) {
            if ($('#loading').length > 0) $('#loading').remove();
            var view = new favMovieView({
                model: movie
            });
            this.$("#favMovies").append(view.render().el);
        }
    });
    //var App = new AppView();*/
///////
$(function () {
    AB.run();
});
