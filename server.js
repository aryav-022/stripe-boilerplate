require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
app.use(express.json());
app.use(
	cors({
		origin: [process.env.CLIENT_URL],
	})
);

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

app.post("/create-checkout-session", async (req, res) => {
	try {
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			mode: "payment",
			line_items: await Promise.all(
				req.body.items.map(async (item) => {
					const res = await fetch(`${process.env.STRAPI_SERVER_URL}/api/courses/${item.id}?populate=*`);
					const course = (await res.json()).data;
					return {
						price_data: {
							currency: "inr",
							product_data: {
								name: course.attributes.name,
								images: [
									`${process.env.STRAPI_SERVER_URL}${course.attributes?.thumbnail?.data?.attributes?.url}`,
								],
							},
							unit_amount: course.attributes.price * 100,
						},
						quantity: item.quantity,
					};
				})
			),
			success_url: `${process.env.CLIENT_URL}/success`,
			cancel_url: `${process.env.CLIENT_URL}/cancel`,
		});
		res.json({ url: session.url });
	} catch (e) {
		console.log(e);
		res.status(500).json({ error: e.message });
	}
});

app.listen(3000);
