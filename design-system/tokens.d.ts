export declare const colors: {
  brand: { primary: string; primaryHover: string; primaryLight: string }
  bg: { base: string; surface: string }
  text: { primary: string; muted: string }
  border: { default: string }
  status: { success: string; warning: string; error: string; info: string }
}

export declare const spacing: {
  0: string
  1: string
  2: string
  3: string
  4: string
  5: string
  6: string
  8: string
  10: string
  12: string
  16: string
}

export declare const typography: {
  fontFamily: { sans: string[] }
  fontSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
  }
  fontWeight: { normal: string; medium: string; semibold: string; bold: string }
}

export declare const radius: { sm: string; md: string; lg: string; full: string }

export declare const tokens: {
  colors: typeof colors
  spacing: typeof spacing
  typography: typeof typography
  radius: typeof radius
}
