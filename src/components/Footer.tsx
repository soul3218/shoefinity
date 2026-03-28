import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-secondary/50 py-12">
    <div className="container mx-auto px-4">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <h3 className="font-display text-xl font-bold text-gradient mb-3">ShoeFinity</h3>
          <p className="text-sm text-muted-foreground">Premium footwear for every step of your journey.</p>
        </div>
        <div>
          <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider">Shop</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/shop?category=running" className="hover:text-foreground">Running</Link></li>
            <li><Link to="/shop?category=casual" className="hover:text-foreground">Casual</Link></li>
            <li><Link to="/shop?category=basketball" className="hover:text-foreground">Basketball</Link></li>
            <li><Link to="/shop?category=lifestyle" className="hover:text-foreground">Lifestyle</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Shipping</li>
            <li>Returns</li>
            <li>Size Guide</li>
            <li>Contact</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>About</li>
            <li>Careers</li>
            <li>Privacy</li>
            <li>Terms</li>
          </ul>
        </div>
      </div>
      <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        © 2026 ShoeFinity. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
