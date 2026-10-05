// Links that open a place in a maps app. The event's location is free text
// typed in /admin/events ("OLD SCHOOL CLUB, HAIFA"), so these are searches
// for that text rather than coordinates — a venue name plus city is
// enough for both apps to find it, and the admin can type a street address
// instead when a venue is hard to find by name.
//
// Both are universal links: on a phone they open the app if it's
// installed, and fall back to the website if not. encodeURIComponent
// keeps anything typed in the admin (&, #, spaces, Hebrew/Arabic) from
// breaking out of the query string.

export function googleMapsUrl(place: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

export function wazeUrl(place: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(place)}&navigate=yes`;
}
