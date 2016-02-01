<?php
	/*
	 * Main reporting code
	 */
	
	$m = new Memcached( );
	$m->addServer( '/var/run/memcached/memcached.sock', 0 );
	
	$MakeMojangNewsRequest = false;
	
	if( !( $PSA = $m->get( 'mc_status_mojang' ) ) )
	{
		$MakeMojangNewsRequest = true;
	}
	
	require __DIR__ . '/MinecraftStatusChecker.class.php';
	
	$MinecraftStatus = new MinecraftStatusChecker( $MakeMojangNewsRequest );
	
	$Answer = Array(
		'v'            => 10,
		'last_updated' => Date( 'H:i:s T' ),
		'report'       => $MinecraftStatus->GetReport( )
	);
	
	unset( $MakeMojangNewsRequest, $MinecraftStatus );
	
	if( File_Exists( 'psa.txt' ) )
	{
		if( $PSA != false )
		{
			$PSA .= '<hr class="dotted">';
		}
		
		$PSA .= File_Get_Contents( 'psa.txt' );
	}
	
	if( $PSA != false )
	{
		$Answer[ 'psa' ] = $PSA;
		
		unset( $PSA );
	}
	
	$Raw = $Answer[ 'report' ];
	
	foreach( $Raw as $Service => $Report )
	{
		$Downs = (int)$m->get( 'mc_status_' . $Service );
		
		if( $Report[ 'status' ] === MinecraftStatusChecker :: STATUS_OFFLINE )
		{
			$Answer[ 'report' ][ $Service ][ 'downtime' ] = '±' . ++$Downs;
		}
	}
	
	$m->set( 'mc_status', JSON_Encode( $Answer ), 1800 );
	
	unset( $Downs, $Report, $Service, $Answer );
	
	/*
	 * Downtime reporting
	 */
	
	$ProperNames = Array(
		'login'   => 'Login Service',
		'session' => 'Multiplayer Sessions',
		'website' => 'Minecraft Website',
		'skins'   => 'Player Skins',
		'realms'  => 'Minecraft Realms'
	);
	
	$ProperNameAdj = Array(
		'login'   => 'is',
		'session' => 'are',
		'website' => 'is',
		'skins'   => 'are',
		'realms'  => 'are'
	);
	
	if( ( $BackOnline = $m->get( 'mc_status_back_online' ) ) )
	{
		$m->delete( 'mc_status_back_online' );
		
		foreach( $BackOnline as $Service => $Downs )
		{
			if( $Raw[ $Service ] === MinecraftStatusChecker :: STATUS_OFFLINE )
			{
				$m->set( 'mc_status_' . $Service, ++$Downs, 120 );
			}
			else
			{
				$Adj = $ProperNameAdj[ $Service ];
				
				//Tweet( ' ✔ ' . $ProperNames[ $Service ] . ' ' . $Adj . ' back online, ' . ( $Adj === 'is' ? 'it was' : 'they were' ) . ' down for ' . $Downs . ' minutes', Time( ) - 60 );
			}
		}
	}
	
	$BackOnline = Array( );
	
	foreach( $Raw as $Service => $Report )
	{
		if( !Array_Key_Exists( $Service, $ProperNames ) )
		{
			continue;
		}
		
		$Downs = (int)$m->get( 'mc_status_' . $Service );
		
		if( $Report[ 'status' ] === MinecraftStatusChecker :: STATUS_OFFLINE )
		{
			$m->set( 'mc_status_' . $Service, ++$Downs, 120 );
			
			if( $Downs == 20 )
			{
				//Tweet( ' ✖ ' . $ProperNames[ $Service ] . ' ' . $ProperNameAdj[ $Service ] . ' down', Time( ) - 1200 );
			}
			else if( $Downs % 60 == 0 )
			{
				//Tweet( ' ♦ ' . $ProperNames[ $Service ] . ' ' . $ProperNameAdj[ $Service ] . ' still down, ' . $Downs . ' minutes' );
			}
		}
		else if( $Downs > 0 )
		{
			$m->delete( 'mc_status_' . $Service );
			
			if( $Downs >= 20 )
			{
				$BackOnline[ $Service ] = $Downs;
			}
		}
	}
	
	if( !Empty( $BackOnline ) )
	{
		$m->set( 'mc_status_back_online', $BackOnline, 120 );
	}
	
	function HandleNews( $Data, $Code )
	{
		if( $Code !== 200 )
		{
			return;
		}
		
		global $PSA, $m;
		
		$Data = JSON_Decode( $Data, true );
		
		if( $Data === false || Empty( $Data ) )
		{
			$m->set( 'mc_status_mojang', '', 300 );
			
			return;
		}
		
		$PSA = '';
		
		foreach( $Data as $Message )
		{
			if( $Message[ 'game' ] !== 'Minecraft' )
			{
				continue;
			}
			
			if( !Empty( $PSA ) )
			{
				$PSA .= '<hr class="dotted">';
			}
			
			$PSA .= '<h3 style="margin-top:0">' . HTMLEntities( $Message[ 'headline' ] ) .
			        ' <span class="muted" style="font-weight:400">(from <a href="http://help.mojang.com/">help.mojang.com</a>)</span></h3>' . $Message[ 'message' ];
		}
		
		$m->set( 'mc_status_mojang', $PSA, 300 );
	}
