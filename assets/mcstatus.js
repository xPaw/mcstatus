( function( win )
{
	var currentVersion = 10,
	
	$ = win.jQuery,
	
	secondsToUpdate = 0,
	
	notifStorage = 'mcstatus_notif_disabled',
	notifDisable = 'Disable notifications',
	
	storage = win.localStorage,
	notifications = win.Notification,
	
	announcementElement = $( '#announcement' ),
	secondsElement = $( '#time-to-update' ),
	lastUpdateElement = $( '#last-update' ),
	notifElement = $( '.notifications' ),
	
	prevCheckDown = false,
	loadState = 0,
	
	statusElements =
	{
		login  : $( '#login' ),
		website: $( '#website' ),
		session: $( '#session' ),
		skins  : $( '#skins' ),
		realms : $( '#realms' )
	},
	
	tick = function( )
	{
		if( secondsToUpdate <= 0 )
		{
			secondsToUpdate = 31;
			
			$.ajax( {
				url: 'status.json',
				dataType: 'json',
				error: handleError,
				success: updateStatus
			} );
		}
		else
		{
			secondsToUpdate -= 1;
			
			secondsElement.text( secondsToUpdate < 10 ? '0' + secondsToUpdate : secondsToUpdate );
			
			setTimeout( tick, 1000 );
		}
	},
	
	handleError = function( )
	{
		if( !loadState )
		{
			announcementElement.html( 'Failed to get current status, please try again later.' ).show( );
			
			$.each( statusElements, function( name, element )
			{
				element.find( '.status' ).text( 'Failed' );
			} );
		}
		
		tick( );
	},
	
	updateStatus = function( json )
	{
		var element, downNow = false;
		
		$.each( json.report, function( service, status )
		{
			element = statusElements[ service ];
			
			if( element )
			{
				if( !element.hasClass( status.status ) )
				{
					element.removeClass( 'problem down up' ).addClass( status.status );
				}
				
				element.find( '.status' ).text( status.title );
				element = element.find( '.uptime' ).text( status.downtime ? 'Down for ' + status.downtime + 'm' : '\xa0' );
				
				if( status.status === 'down' )
				{
					downNow = true;
				}
			}
		} );
		
		lastUpdateElement.text( json.last_updated );
		
		if( json.v && json.v !== currentVersion )
		{
			element = '<span class="light-blue">Warning!</span> Refresh this page to receive latest version.';
			
			json.psa = json.psa ? element + '<hr class="dotted">' + json.psa : element;
		}
		
		if( json.psa )
		{
			announcementElement.html( json.psa ).show( );
		}
		else if( announcementElement.is( ':visible' ) )
		{
			announcementElement.hide( );
		}
		
		tick( );
		
		if( downNow )
		{
			prevCheckDown = true;
		}
		else if( prevCheckDown )
		{
			prevCheckDown = false;
			
			showNotification( );
		}
		
		loadState = 1;
	},
	
	clickNotification = function( )
	{
		if( !canDisplayNotification( ) )
		{
			if( getNotificationStatus( ) === 'denied' )
			{
				alert( 'You must allow notifications in your browser\'s settings' );
			}
			else
			{
				notifications.requestPermission( function( permission )
				{
					// Chrome bugfix
					if( !( 'permission' in notifications ) )
					{
						notifications.permission = permission;
					}
					
					if( permission === 'granted' )
					{
						notifElement.addClass( 'enabled' ).find( 'a' ).text( notifDisable );
						
						storageRemove( );
					}
				} );
			}
			
			return false;
		}
		
		if( notifElement.hasClass( 'enabled' ) )
		{
			$( this ).text( 'Enable notifications' );
			
			storageSet( );
		}
		else
		{
			$( this ).text( notifDisable );
			
			storageRemove( );
		}
		
		notifElement.toggleClass( 'enabled' );
		
		return false;
	},
	
	showNotification = function( )
	{
		if( !notifications || !canDisplayNotification( ) || storageGet( ) )
		{
			return;
		}
		
		var notification = new notifications( 'Minecraft Back Online',
											{
												'body': 'You can try playing now!',
												'icon': $( 'link[rel="image_src"]' ).attr( 'href' )
											} );
		
		notification.onshow = function( )
		{
			var timer = win.setTimeout( function( )
			{
				notification.close( );
			}, 5000 );
			
			notification.onclose = function( )
			{
				clearTimeout( timer );
			};
		};
	},
	
	getNotificationStatus = function( )
	{
		if( 'permission' in notifications )
		{
			return notifications.permission;
		}
		else if( 'webkitNotifications' in win )
		{
			return [ 'granted', 'default', 'denied' ][ webkitNotifications.checkPermission( ) ];
		}
	},
	
	canDisplayNotification = function( )
	{
		return getNotificationStatus( ) === 'granted';
	},
	
	storageGet = function( )
	{
		return storage && storage.getItem( notifStorage ) === 'true';
	},
	
	storageSet = function( )
	{
		return storage && storage.setItem( notifStorage, 'true' );
	},
	
	storageRemove = function( )
	{
		return storage && storage.removeItem( notifStorage );
	};
	
	// Start the app
	tick( );
	
	// Set correct text in notifications element
	if( !storage || !notifications )
	{
		notifElement.text( 'Your browser doesn\'t support notifications' );
	}
	else
	{
		var link = notifElement.find( 'a' );
		
		link.on( 'click', clickNotification );
		
		if( canDisplayNotification( ) && !storageGet( ) )
		{
			notifElement.addClass( 'enabled' );
			
			link.text( notifDisable );
		}
	}
	
	// Remove utm_ params
	if( win.history && win.history.replaceState && win.location.search.match( /utm_/ ) )
	{
		win._gaq.push( function( ) {
			win.history.replaceState( {}, "", win.location.pathname );
		} );
	}
	
	// Delete noscript element, workaround IE bug
	$( 'noscript' ).remove( );
}( window ) );
