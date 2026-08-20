'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Upload, BarChart2, Zap, Brain, Share2, Database, FileSpreadsheet, Search, LayoutDashboard } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <Database className="h-6 w-6 text-primary" />
              <span>DataLens</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                How it Works
              </Link>
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            <span>v1.0 - Now in Beta</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Google Analytics + ChatGPT{' '}
            <span className="text-primary">for Your Business Data</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Upload CSV/Excel files, get instant AI-powered insights, build interactive dashboards,
            and ask questions in plain English. No SQL required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/register">
              <Button size="lg" className="gap-2 px-8">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#demo">
              <Button size="lg" variant="outline" className="gap-2 px-8">
                Watch Demo
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <span>CSV, Excel, Parquet, JSON</span>
            <span>•</span>
            <span>No-code</span>
            <span>•</span>
            <span>AI-powered</span>
            <span>•</span>
            <span>Shareable dashboards</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Understand Your Data</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From upload to insight in minutes, not hours.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1: Upload */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Drag & Drop Upload</CardTitle>
              <CardDescription>
                Support for CSV, Excel, Parquet, and JSON. Automatic type detection and data cleaning.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 2: Auto Profiling */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BarChart2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Auto EDA & Profiling</CardTitle>
              <CardDescription>
                Instant statistical profiles: distributions, correlations, missing values, outliers, and data quality scores.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 3: NL Query */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Natural Language Queries</CardTitle>
              <CardDescription>
                Ask "Why did sales drop in March?" or "Top 10 customers by revenue" - get SQL, results, and charts instantly.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 4: Chart Builder */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <LayoutDashboard className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Visual Chart Builder</CardTitle>
              <CardDescription>
                Drag-and-drop chart creation with 15+ chart types. Powered by Plotly for interactive, publication-ready visualizations.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 5: Dashboards */}
          <Card className="hover:shadow-lg transition-shadow lg:col-span-2">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <LayoutDashboard className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Interactive Dashboards</CardTitle>
              <CardDescription>
                Build shareable dashboards with global filters, KPI cards, and real-time updates. Embed anywhere with iframe.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 6: Sharing */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Share2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>One-Click Sharing</CardTitle>
              <CardDescription>
                Generate public links, embed dashboards, schedule email reports, export to PDF/PNG. Collaborate with your team.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">From Data to Insights in 4 Steps</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No data engineering required. Just upload and explore.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Upload Data', desc: 'Drag CSV, Excel, or Parquet files. We handle schema detection, type inference, and data cleaning automatically.' },
              { step: '02', title: 'Auto Profile', desc: 'Get instant statistical analysis: distributions, correlations, missing values, outliers, and data quality scores.' },
              { step: '03', title: 'Ask Questions', desc: 'Type questions in plain English. Get SQL queries, results, and suggested visualizations powered by AI.' },
              { step: '04', title: 'Build & Share', desc: 'Create interactive dashboards with drag-and-drop. Share via link, embed in Notion/Confluence, or export to PDF.' },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 text-4xl font-bold text-primary/20">
                  {item.step}
                </div>
                <Card className="h-full pt-16">
                  <CardHeader>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <CardDescription>{item.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Understand Your Data?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join hundreds of analysts and business users who use DataLens to go from raw data to insights in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2 px-8">
                  Start Free - No Credit Card Required
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#demo">
                <Button size="lg" variant="outline" className="px-8">
                  Schedule a Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-4">
                <Database className="h-6 w-6 text-primary" />
                <span>DataLens</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                Business analytics platform that combines the power of SQL with the simplicity of chat.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">Auto Profiling</Link></li>
                <li><Link href="#" className="hover:text-foreground">NL Query</Link></li>
                <li><Link href="#" className="hover:text-foreground">Chart Builder</Link></li>
                <li><Link href="#" className="hover:text-foreground">Dashboards</Link></li>
                <li><Link href="#" className="hover:text-foreground">Sharing & Embeds</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">Documentation</Link></li>
                <li><Link href="#" className="hover:text-foreground">API Reference</Link></li>
                <li><Link href="#" className="hover:text-foreground">Blog</Link></li>
                <li><Link href="#" className="hover:text-foreground">Templates</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">About</Link></li>
                <li><Link href="#" className="hover:text-foreground">Careers</Link></li>
                <li><Link href="#" className="hover:text-foreground">Privacy</Link></li>
                <li><Link href="#" className="hover:text-foreground">Terms</Link></li>
                <li><Link href="#" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2024 DataLens. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}