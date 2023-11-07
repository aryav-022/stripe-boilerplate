require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
app.use(express.json());
app.use(
	cors({
		origin: ["http://localhost:5173", "http://localhost:1337"],
	})
);

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

const storeItems = new Map();

try {
    fetch(`${process.env.STRAPI_SERVER_URL}/api/courses`)
        .then((response) => response.json())
        .then((data) => {
            data.data.forEach((course) => {
                storeItems.set(course.id, {
                    priceInCents: course.attributes.price * 100,
                    name: course.attributes.name,
                });
            });
        });
} catch (e) {
    console.log(e);
}

app.post("/create-checkout-session", async (req, res) => {
	try {
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			mode: "payment",
			line_items: req.body.items.map((item) => {
				const storeItem = storeItems.get(item.id);
				return {
					price_data: {
						currency: "inr",
						product_data: {
							name: storeItem.name,
						},
						unit_amount: storeItem.priceInCents,
					},
					quantity: item.quantity,
				};
			}),
			success_url: `${process.env.CLIENT_URL}/success`,
			cancel_url: `${process.env.CLIENT_URL}/cancel`,
		});
		res.json({ url: session.url });
	} catch (e) {
		res.status(500).json({ error: e.message });
	}
});

app.listen(3000);
