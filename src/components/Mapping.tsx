// @flow 
import { Grid, MenuItem, Select, Button } from '@material-ui/core';
import { Loader } from 'google-maps';
import * as React from 'react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentPosition } from '../util/geolocation';
import { Route } from '../util/model';
import io from 'socket.io-client'

const API_URL = process.env.REACT_APP_API_URL as string

const googleMapsLoader = new Loader(process.env.REACT_APP_GOOGLE_API_KEY)

type Props = {

};

export const Mapping = (props: Props) => {

  const [routes, setRoutes] = useState<Route[]>([])
  const [routeIdSelected, setRouteIdSelected] = useState<string>("")
  const mapRef = useRef<google.maps.Map>()
  const socketIoRef = useRef<SocketIOClient.Socket>()
  const startMarkerRef = useRef<google.maps.Marker>()


  useEffect(() => {
    socketIoRef.current = io.connect(API_URL)
    socketIoRef.current.on('connect', () => console.log('conectou'))
    socketIoRef.current.on('error', (err: any) => console.log(`error - ${err}`))
    socketIoRef.current?.on("new-position", (data: { routeId: string, position: [number, number], finished: boolean }) => {
      startMarkerRef.current?.setPosition({
        lat: data.position[0],
        lng: data.position[1]
      })
    })
  }, [])


  useEffect(() => {
    fetch(`${API_URL}/routes`)
      .then((data) => data.json())
      .then((data) => setRoutes(data));
  }, [])

  const startRoute = useCallback((event: FormEvent) => {
    event.preventDefault();
    const route = routes.find(route => route._id === routeIdSelected)

    const color = routeIdSelected === "1" ? "blue" : routeIdSelected === "2" ? "red" : "green"

    const svgMarker = {
      path:
        "M15.55 13c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.37-.66-.11-1.48-.87-1.48H5.21l-.94-2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2h7.45zM6.16 6h12.15l-2.76 5H8.53L6.16 6zM7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z",
      fillColor: color,
      fillOpacity: 0.6,
      strokeWeight: 0,
      rotation: 0,
      scale: 2,
      anchor: new google.maps.Point(15, 30),
    };

    const svgMarkerTarget = {
      path:
        "M10.453 14.016l6.563-6.609-1.406-1.406-5.156 5.203-2.063-2.109-1.406 1.406zM12 2.016q2.906 0 4.945 2.039t2.039 4.945q0 1.453-0.727 3.328t-1.758 3.516-2.039 3.070-1.711 2.273l-0.75 0.797q-0.281-0.328-0.75-0.867t-1.688-2.156-2.133-3.141-1.664-3.445-0.75-3.375q0-2.906 2.039-4.945t4.945-2.039z",
      fillColor: color,
      fillOpacity: 0.6,
      strokeWeight: 0,
      rotation: 0,
      scale: 2,
      anchor: new google.maps.Point(15, 30),
    };

    const start = new google.maps.Marker({
      position: route?.startPosition,
      map: mapRef.current,
      icon: svgMarker
    })
    const end = new google.maps.Marker({
      position: route?.endPosition,
      map: mapRef.current,
      icon: svgMarkerTarget
    })

    const bounds = new google.maps.LatLngBounds()

    bounds.extend(start.getPosition() as any)
    bounds.extend(end.getPosition() as any)

    mapRef.current?.fitBounds(bounds)

    const directionsRenderer: google.maps.DirectionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: color,
        strokeOpacity: 0.5,
        strokeWeight: 5
      }
    })

    directionsRenderer.setMap(mapRef.current as google.maps.Map)

    new google.maps.DirectionsService().route({
      origin: start.getPosition() as google.maps.LatLng,
      destination: end.getPosition() as google.maps.LatLng,
      travelMode: google.maps.TravelMode.DRIVING
    }, (result, status) => {

      if (status === "OK") {
        directionsRenderer.setDirections(result)
      }

    })

    socketIoRef.current?.emit("new-direction", {
      routeId: routeIdSelected
    })

    startMarkerRef.current = start

  }, [routeIdSelected, routes])



  useEffect(() => {
    (async () => {
      const [, position] = await Promise.all([
        googleMapsLoader.load()
        // ,getCurrentPosition({ enableHighAccuracy: true })
      ])

      const divMap = document.getElementById('map') as HTMLElement
      mapRef.current = new google.maps.Map(divMap, {
        zoom: 15,
        center: {
          lat: -23.533773,
          lng: -46.625290
        }
      })
    })()
  }, [])


  return (
    <Grid container style={{ width: "100%", height: "100%" }}>
      <Grid item xs={12} sm={3} >
        <form onSubmit={startRoute} >
          <Select fullWidth
            value={routeIdSelected}
            displayEmpty
            onChange={(event) => setRouteIdSelected(event.target.value + "")} >
            <MenuItem value="">
              Selecione uma corrida
            </MenuItem>
            {routes?.map((route, index) => {
              return <MenuItem value={route._id} key={index} >
                {route.title}
              </MenuItem>
            })}
          </Select>
          <Button fullWidth type="submit" color="primary" variant="contained">Iniciar uma corrida</Button>
        </form>
      </Grid>
      <Grid item xs={12} sm={9} >
        <div id="map" style={{ width: "100%", height: "100%" }}>
        </div>
      </Grid>
    </Grid>
  );
};