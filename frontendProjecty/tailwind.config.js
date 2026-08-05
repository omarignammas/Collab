/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
  	extend: {
  		colors: {
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			light: '#F9FAFB',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			xl: 'calc(var(--radius) + 6px)',
  			'2xl': 'calc(var(--radius) + 12px)'
  		},
  		boxShadow: {
  			'ios-sm': '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 1px -1px rgb(0 0 0 / 0.03)',
  			ios: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 4px 12px -2px rgb(0 0 0 / 0.05)',
  			'ios-md': '0 4px 16px -4px rgb(0 0 0 / 0.08), 0 2px 6px -2px rgb(0 0 0 / 0.06)',
  			'ios-lg': '0 12px 32px -8px rgb(0 0 0 / 0.16), 0 4px 12px -4px rgb(0 0 0 / 0.08)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
