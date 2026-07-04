const { colors, typography, radius } = require('./tokens')

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: colors.brand.primary,
          primary: colors.brand.primary,
          hover: colors.brand.primaryHover,
          light: colors.brand.primaryLight,
        },
        bg: {
          base: colors.bg.base,
          surface: colors.bg.surface,
        },
        text: {
          primary: colors.text.primary,
          muted: colors.text.muted,
        },
        border: {
          DEFAULT: colors.border.default,
        },
        status: {
          success: colors.status.success,
          warning: colors.status.warning,
          error: colors.status.error,
          info: colors.status.info,
        },
      },
      fontFamily: {
        sans: typography.fontFamily.sans,
      },
      borderRadius: {
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
        full: radius.full,
      },
    },
  },
}
