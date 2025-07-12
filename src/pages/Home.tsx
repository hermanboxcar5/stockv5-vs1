
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Package, Users, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <img
              src="/logo.png"
              alt="StockV5"
              className="h-16 w-16 mr-4"
            />
            <h1 className="text-5xl font-bold text-foreground">StockV5</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            VEX V5 Inventory Management System for teams and organizations
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/login">
                Log In <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <Package className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>
                Track your VEX V5 parts with stock levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Prebuilt VEX V5 Parts library</li>
                <li>• Warehouse data helps automate stock tracking</li>
                <li>• Use claims and deposits to put items into and take items out of warehouse</li>
                <li>• Automated shopping list generation and quick order system</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Team Collaboration</CardTitle>
              <CardDescription>
                Manage claims, deposits, and team inventory with role-based permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Multi-user organizations</li>
                <li>• Claims and deposit workflow</li>
                <li>• Role-based access control</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Advanced Integration</CardTitle>
              <CardDescription>
                Quick Order VEX parts without hassle and import material lists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Quick Order system prepopulates your VEX Robotics website shopping cart automatically</li>
                <li>• Exports data as VEX-compatable formats</li>
                <li>• Data imports from popular CAD programs including Onshape</li>
              </ul>
            </CardContent>
          </Card>
        </div>




        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Versions
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-16 mb-16">
          <Card>
            <CardHeader>
              <CardTitle>v1.1.X Blackburn (Current)</CardTitle>
              <CardDescription>
                Released 7/12/2025
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CardDescription>
                <b>
                  Changelog
                </b>
              </CardDescription>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Got rid of per-device fs data storage for a centralized </li>
                <li>• Added role-based user management for organizations</li>
                <li>• Incorperated Google Authentication for users</li>
                <li>• Automated shopping list generation and quick order system</li>
              </ul>
              <br /><br />
              <CardDescription>
                <b>
                  Access: Click log in and use Google oAuth to start using StockV5. <br /> <br />
                  Note: If you need help transitioning from a Legacy version, join the discord. Information will be posted there, and you can always ask too!
                </b>
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>v1.0.X Andes (Legacy)</CardTitle>
              <CardDescription>
                Released 6/30/2025
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CardDescription>
                <b>
                  Changelog (First version)
                </b>
              </CardDescription>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Warehouse keeps track of stock amounts</li>
                <li>• Claims can be used to take items out of the warehouse</li>
                <li>• Deposits can be used to put items into the warehouse</li>
                <li>• Automated shopping list generation and quick order system</li>
              </ul>
              <br /><br />
              <CardDescription>
                <b>
                  Access: <a className = "text-blue-600 dark:text-blue-200 underline" href="https://legacy.stockv5.ambersys.app">Link</a>
                </b>
              </CardDescription>
            </CardContent>
          </Card>
        </div>





        <div className="text-center pb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Discord Server
          </h2>
          <p className="text-muted-foreground mb-8">
            Join the community, get support for issues, and report bugs
          </p>
          <div className="flex justify-center items-start space-x-8">
            <div className="max-w-xs text-md text-muted-foreground space-y-2">
              <Card className="h-full" style={{ height: 500 }}>
                <CardContent>
                  <ul className="p-8 text-left text-md text-gray-50 space-y-2">
                    <h3 className="text-3xl font-bold text-foreground mb-4">
                      Why Join?
                    </h3>
                    <li>• Get support quickly and effectively</li>
                    <li>• Chat with other V5RC competitors and enthusiasts</li>
                    <li>• Give your input on what functionality you want</li>
                    <li>• Keep updated on release logs and upcoming updates</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            <iframe
              src="https://discord.com/widget?id=1389377110321266709&theme=dark"
              width="700"
              height="500"
              frameBorder="0"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            />
          </div>
        </div>







        <div className="text-center pb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to optimize your inventory?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join teams already using StockV5 to manage their VEX V5 inventory efficiently
          </p>
          <Button asChild size="lg">
            <Link to="/login">
              Start Managing Inventory <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
