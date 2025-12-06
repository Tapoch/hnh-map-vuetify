import 'vuetify/styles'
import {createVuetify as createVuetifyCore} from 'vuetify'
import {aliases, mdi} from 'vuetify/iconsets/mdi-svg'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export function createVuetify() {
    return createVuetifyCore({
        components,
        directives,
        icons: {
            defaultSet: 'mdi',
            aliases,
            sets: {mdi}
        }
    })
}
