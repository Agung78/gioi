// Full menu as text, transcribed from public/menus/bali-menu.pdf (the PDF stays the source of truth; update both together).
// Prices are in thousand rupiah as printed on the menu, before service charge and government tax.
// ponytail: static map like VENUE_SEO; move to the DB when menus are edited from admin.
// Dietary icons (pork, seafood, dairy, plant based, spicy) exist only in the PDF and are not reproduced here.

type Price = number | [label: string, thousandIdr: number][]
type Row = [name: string, price: Price, description?: string]

export interface MenuItem {
  name: string
  description?: string
  prices: { label?: string; idr: number }[]
}
export interface MenuSection {
  id: string
  title: string
  note?: string
  items: MenuItem[]
}
export interface VenueMenu {
  groups: { id: string; title: string; sections: MenuSection[] }[]
}

const section = (id: string, title: string, rows: Row[], note?: string): MenuSection => ({
  id,
  title,
  ...(note ? { note } : {}),
  items: rows.map(([name, price, description]) => ({
    name,
    ...(description ? { description } : {}),
    prices: typeof price === 'number' ? [{ idr: price * 1000 }] : price.map(([label, k]) => ({ label, idr: k * 1000 })),
  })),
})

export const VENUE_MENU: Record<string, VenueMenu> = {
  bali: {
    groups: [
      {
        id: 'food',
        title: 'Food',
        sections: [
          section('all-day-brunch', 'All Day Brunch', [
            ['OG Breakfast', 75, 'GIOI OG breakfast platter style with egg, bacon, sausage, sourdough, roasted potato, mushroom accompanied with salad'],
            ['OG Smoothie Bowl', 75, 'A vibrant blend of dragon fruit smoothie bowl with fresh fruits on top strawberry, banana, kiwi, grapes, granola, dry coconut and mint leaves'],
            ['Pancake', 55, 'Soft golden brown pancake with banana, butter, icing sugar, honey and edible flowers'],
            ['Avocado On Toast', 60, 'Creamy smashed avocado spread over sourdough with egg, parmesan cheese with salad on the side'],
            ['Eggs Benedict', 75, 'Perfect poached egg sitting atop toasted English muffin, with crispy bacon, drizzled with hollandaise sauce'],
          ]),
          section('small-plates', 'Small Plates', [
            ['El Pollo Al Carbon', 70, 'Adobo grilled chicken with the classic taco toppings'],
            ['Taco De Pescado', 75, 'Deep fried fish with the classic taco toppings'],
            ['Taco Al Pastor', 85, 'Adobo chargrilled marinated pork neck with the classic taco toppings'],
            ['OG Truffle Fries', 65, 'Classic fries with aromatic truffle oil and parmesan cheese'],
            ['OG Ocean Fries', 55, "Seasoned with the ocean's best seaweed and salted fish mixed with chili oil"],
            ['OG Just Fries', 35, 'Straight cut fries seasoned with salt and pepper'],
            ['Royal Vietnamese Rolls', 95, 'Vermicelli, raw vegetables spring roll with soy pearls and peanut hoisin'],
            ['Salt & Pepper Tofu', 68, 'Deep fried silky tofu tossed in crispy garlic and chili'],
            ['Spiced Grilled Corn Ribs', 65, 'Grilled corn ribs lathered with ebi butter and sweet soy'],
            ['Gangnam Wings', 85, 'Deep fried chicken wings with a Korean twist of samyang sauce and honey mustard'],
            ['Satay Lilit', 85, 'Balinese skewers with a side of sambal matah'],
            ['XO Wonton', 80, 'Shrimp and chicken wonton served with mushroom in XO sauce and black vinegar'],
            ['Mala Chicken Pop', 85, 'Deep fried chicken popcorn tossed in mala spice'],
            ['Sweet Potato Chips', 45, 'Golden-brown potato chips seasoned to perfection for a delightful crunch in every bite'],
            ['OG Nachos', 100, 'Tortilla chips loaded with savory con carne, three flavorful sauces, nacho cheese and pickled jalapeño. Available with plant-based con carne or beef con carne'],
            ['Yuca Fries', 55, 'Deep fried cassava with cilantro aioli'],
          ]),
          section('soup-salad', 'Soup & Salad', [
            ['Thai Bouillabaisse', 160, 'A classic French twist on a Thai favorite with prawns and mussels'],
            ['Soup of the Day', 95, 'Ask your waiter for the special soup of the day'],
            ['Som Tam', 95, 'Twist of the traditional Thai salad with shrimp, pomelo and homemade dressing'],
            ['Miso Caesar', 95, 'A Japanese twist on the classic caesar salad with a choice of miso glazed grilled chicken or prawn'],
          ]),
          section('sharing-plates', 'Sharing Plates', [
            ['OG Seafood Platter', 455, 'Grilled traditional style seasonal fresh fish and seafood, grilled corn with three kinds of sambal'],
            ['Salmon Lodeh', 200, "Crispy skin salmon served with GIOI's creamy twist on the traditional lodeh"],
            ['Crying Tiger', 385, 'Chargrilled Thai style marinated Australian striploin with a side of Thai salad and nam jim jiew sauce'],
            ['Crispy Pork Belly', 225, 'Slow-cooked crispy skin pork belly, glazed with sticky black vinegar caramel sauce and topped with fresh rujak'],
            ['Crispy Duck', [['Half', 190], ['Whole', 350]], "GIOI signature. Crispy, juicy, marinated duck served with GIOI's rice and jukut kalasan"],
            ['Mango Fish', 180, 'Deep fried Thai battered fish topped with Thai mango salad and nahm jim'],
            ['Sate Merah Klungkung', [['Pork', 95], ['Chicken', 75]], 'Traditional Indonesian favorite satay with a special chili spice mix served on a burnt coconut briquette (arang batok kelapa menyala)'],
            ['Jimbaran King Prawn', 185, 'Balinese traditional style grilled king prawn brushed with Jimbaran sauce and a side of plecing kangkung'],
          ]),
          section('individual-plates', 'Individual Plates', [
            ['Pad Kee Mao', 95, "You don't have to be drunk to enjoy this. Wide rice noodles stir fried with prawn, chicken, sweet basil and vegetables with a little kick"],
            ['Grilled Giant River Prawn', 200, "Grilled giant river prawn glazed with prawn butter, served with mango salad, GIOI's rice and Thai green seafood sauce"],
            ['Ayam Betutu (Nasi Campur Bali)', 95, 'A Balinese favorite chicken rice dish with ayam betutu, jukut kalasan, cassava leaves, crispy chicken skin, balung soup and two kinds of sambal'],
            ['Babi Guling (Nasi Campur Bali)', 100, 'A Balinese favorite pork rice dish with roast pork, jukut kalasan, cassava leaves, satay lilit, crispy pork, balung soup and two kinds of sambal'],
            ['Chicken Fried Rice', 80, 'Traditional fried rice, grilled chicken, egg, acar, kerupuk'],
            ['Pork Fried Rice', 90, 'Traditional fried rice, fried pork, egg, acar, kerupuk'],
            ['Seafood Fried Rice', 95, 'Traditional fried rice, mixed seafood, egg, acar, mango salad'],
            ['Mie Goreng Mamak', 95, 'Malay style fried noodle with fried tofu, fish cake, salted fish and vegetables'],
            ['Legendary Tempong Rice', 125, 'Balinese favorite tempong rice set with traditional fried chicken, empal daging, lalapan, salted fish and sambal tempong'],
          ]),
          section('international-flavour', 'International Flavour', [
            ['Ultimate Burger', 165, 'Juicy beef patty with bacon, American cheese, caramelized onion, relish in a brioche bun'],
            ['Thai Curry Salmon', 175, 'Salmon in a rich and aromatic Thai red curry, infused with coconut milk, herbs and a dash of spice for a comforting and flavorful dish'],
            ['Grilled Octopus', 155, 'Grilled marinated octopus served with pomme purée and a side of mixed greens and romesco sauce'],
            ['Grilled Jerk Chicken', 125, 'Grilled jerk marinated spring chicken served with roasted potato, mixed veggies and chimichurri'],
            ['Steak Frites', 285, 'Grilled Australian striploin steak served with a side of straight cut fries, entrecôte butter and chimichurri'],
            ['Mushroom Pizza', 95, 'Champignon mushroom with truffle bechamel, parmesan and mozzarella'],
            ['Meatmen Pizza', 135, 'A mouthful of pepperoni, chopped steak, sausage, peppers and mozzarella'],
            ['Four Cheese Pizza', 125, 'A cheesy delight with mozzarella, gorgonzola, ricotta and grana padano'],
            ['Creamy Truffle Pasta', 125, 'Pork with creamy truffle mushroom and pecorino'],
            ['Aglio E Olio', 95, 'Italian classic with its simplicity in olive oil, garlic and chili. Available with choices of chicken or tuna'],
            ['Shrimp Pasta', 95, 'Tender shrimp tossed with al dente pasta in a zesty Thai-inspired sauce, bursting with tangy, spicy and aromatic flavors reminiscent of classic Tom Yum'],
            ['Puttanesca', 90, 'Savory delight with tomato base, mushroom and veggies'],
          ]),
          section('vegetables-sides', 'Vegetables & Sides', [
            ['Kangkung Balachan', 45, 'Stir-fried balachan morning glory'],
            ['Stir Fried Mix Greens', 45, 'Seasonal stir-fried vegetables'],
            ['Salt & Pepper Eggplant', 45, 'Crispy eggplant in our legendary salt and pepper seasoning'],
            ['Roasted Baby Potatoes', 45, 'Herbs and garlic sautéed potatoes'],
            ['GIOI Rice', 20],
            ['Shirataki Rice', 35],
            ['Steamed Rice', 20],
          ]),
          section('kids-menu', 'Kids Menu', [
            ['Alfredo', 65, 'Perfectly cooked creamy spaghetti with bacon, mushroom and a sprinkle of parmesan cheese'],
            ['Fish and Chips', 75, 'Ultimate crunch of dory fish fillet with French fries, tartar sauce and lemon'],
            ['Chicken Fingers', 60, 'Juicy, tender chicken strips fillet with tonkatsu mayo, French fries and lemon'],
            ['Kids Pancake', 55, 'Cutely cut pancakes with banana, butter, icing sugar and honey'],
            ['Kids Fried Rice', 50, 'A tasty and mild nasi goreng, specially made for little ones. Stir-fried rice with tender chicken, scrambled egg and fresh veggies full of flavor, not too spicy'],
          ]),
          section('dessert', 'Dessert', [
            ['Molten Callebaut Pandan', 85, 'Soft and crumbly golden sponge pandan filled white chocolate lava cake with pandan ice cream (please allow 25 mins waiting time)'],
            ['GIOI Black Rice Pudding', 60, 'Sweet sticky black rice pudding with homemade spiced mango compote, coconut milk and mango ice cream'],
            ['Dawet Coconut Gelato', 85, 'Dawet hijau, grass jelly, jackfruit compote and coconut gelato'],
            ['Banana Fritters', 45, 'Deep-fried banana fritters drizzled with cinnamon, sugar, completed with chocolate dipping sauce'],
            ['Pisang Bakar', 45, 'Banana with caramelized sugar grilled to perfection, topped with cheese, chocolate with a side of honey'],
            ['Pie Susu', 80, 'A Balinese sweet delicacy made with vanilla essence, milk and coconut tuile'],
          ]),
        ],
      },
      {
        id: 'drinks',
        title: 'Drinks',
        sections: [
          section('zero-proof', 'Zero Proof', [
            ['GIOI Ginger Ale', 45, "GIOI's crafted ginger ale"],
            ['OG Lemonade', 45, "GIOI's crafted lemonade"],
            ['Tamarind Lime', 45, 'Tamarind, lime, mint leaves, soda'],
            ['Sexual Healing', 55, 'Red dragon fruit, elderflower, apple juice, lemon, lemonade'],
            ['Pomegranate Collins', 55, 'Pomegranate juice, lychee, osmanthus, fresh mint, soda'],
            ['Blue My Mind', 55, 'Blue curacao, pineapple juice, coconut milk, passion fruit'],
            ['Nano-Nano', 45, "GIOI's take on Indonesia's old-time favorite candy: manis, asam, asin"],
            ['Timun Lasih', 55, 'Cucumber, coconut water, honeydew, lemon, passion fruit, foam'],
            ['Chai Thai Milk Tea', 45, "GIOI's own twist of chai spice classic Thai milk tea"],
            ['Lychee Yakult', 45, 'Lychee punch and all-time-favorite Yakult'],
          ]),
          section('slushie', 'Slushie', [
            ['Electric Lime Milk', 55, 'Lime, condensed milk'],
            ['Peachy Thyme', 65, 'Peach, lemon, honey, lemonade'],
          ]),
          section('coconut', 'Coconut Special', [
            ['Young Coconut', 45],
            ['Coco Orange', 65, 'Young coconut, orange juice'],
            ['Coco Dino Milo', 55, 'Young coconut, Milo'],
            ['Coco Aren', 48, 'Young coconut, gula aren'],
            ['Coco Lime', 55, 'Young coconut, lime squeeze'],
          ]),
          section('smoothies', 'Smoothies', [
            ['Mango Tango', 55, 'Mango purée, half & half, mint leaves'],
            ['Tropical Smoothies', 55, 'Mixed tropical fruits, plain yogurt, peach'],
            ['Immune Boost', 50, 'Baby pokcoy, apple juice, nutmeg, honey, water'],
          ]),
          section('milkshakes', 'Milkshakes', [
            ['Peanut Butter Cocoa', 55, 'Peanut butter, white chocolate, vanilla ice cream'],
            ['Strawberry Blast', 55, 'Strawberry, fresh milk, strawberry ice cream'],
            ['Ice Cookie Cream', 55, 'Oreo, cookie, fresh milk, vanilla ice cream'],
            ['Chocolate Milkshake', 55],
            ['Vanilla Milkshake', 55],
          ]),
          section('iced-tea', 'Fusion Iced Tea', [
            ['Lychee Tea', 48, 'House blend, lychee'],
            ['Kecombrang Tea', 48, 'House blend, kecombrang, passion fruit'],
            ['Lemon Iced Tea', 48, 'House blend, lemon'],
            ['Apple Mint Tea', 48, 'House blend, apple, fresh mint'],
            ['Lavender Tea', 48, 'House blend tea, lavender'],
            ['Strawberry Tea', 48, 'House blend tea, strawberry'],
            ['House Blend Tea', 48],
          ]),
          section('fresh-juice', 'Fresh Juice', [
            ['Fresh Juice', 60, 'Orange, honeydew, red dragon fruit, watermelon or pineapple'],
            ['Mix Juice', 60],
          ]),
          section('coffee', 'Coffee & Chocolate', [
            ['Espresso', [['Hot', 28]]],
            ['Double Espresso', [['Hot', 35]]],
            ['Piccolo', [['Hot', 35]]],
            ['Macchiato', [['Hot', 35]]],
            ['Hazelnut Latte', [['Hot', 42], ['Iced', 48]]],
            ['Crème Brulee Latte', [['Hot', 42], ['Iced', 48]]],
            ['Salted Caramel Latte', [['Hot', 42], ['Iced', 48]]],
            ['Americano', [['Hot', 35], ['Iced', 43]]],
            ['Cappuccino', [['Hot', 38], ['Iced', 43]]],
            ['Latte', [['Hot', 38], ['Iced', 43]]],
            ['Chocolate', [['Hot', 40], ['Iced', 45]]],
            ['Kopi Nusantara', [['Iced', 45]]],
            ['V60', [['Hot', 40], ['Iced', 40]]],
          ]),
          section('tea', 'Tea Selection', [
            ['English Breakfast Tea', 45],
            ['Chamomile Tea', 45],
            ['Jasmine Tea', 45],
            ['Sencha Tea', 45],
          ]),
          section('kids-drinks', 'Kids Drinks', [
            ['Mirukita', 45, 'Milk, yogurt, melon syrup and strawberry cream'],
            ["Berry's Calpis", 45, 'Strawberry, blueberry, elderflower syrup and Yakult'],
            ['Milo Dinosaurus', 45, 'Milo and condensed milk'],
            ["Chocolate O'nana", 45, 'Milk, vanilla ice cream, chocolate, banana and marshmallow'],
            ['Pudding Tubby', 55, 'Pudding, mochi ice cream, vanilla and chocolate sauce'],
            ['Gummy Bear', 45, 'Cranberry juice, watermelon juice, lime, elderflower syrup and gummy bear candy'],
          ]),
          section('ready-to-drink', 'Ready To Drink', [
            ['Red Bull', 55],
            ['Coke', 35],
            ['Coke Zero', 35],
            ['Sprite', 35],
            ['Pokka Green Tea', 35],
            ['Soda Water', 35],
            ['Balian Natural Mineral Water', [['360 ml', 38], ['760 ml', 70]]],
            ['Balian Sparkling Mineral Water', [['360 ml', 38], ['760 ml', 70]]],
          ]),
        ],
      },
    ],
  },
}

/** schema.org Menu for the venue's full menu page. Every item here is rendered on the page. */
export function menuJsonLd(menu: VenueMenu, url: string, name: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${url}#menu`,
    name,
    url,
    inLanguage: 'en',
    hasMenuSection: menu.groups.flatMap((g) =>
      g.sections.map((s) => ({
        '@type': 'MenuSection',
        name: `${g.title}: ${s.title}`,
        hasMenuItem: s.items.map((i) => ({
          '@type': 'MenuItem',
          name: i.name,
          ...(i.description ? { description: i.description } : {}),
          offers: i.prices.map((p) => ({
            '@type': 'Offer',
            price: String(p.idr),
            priceCurrency: 'IDR',
            ...(p.label ? { name: p.label } : {}),
          })),
        })),
      })),
    ),
  }
}

export const formatIdr = (idr: number) => `IDR ${idr.toLocaleString('en-US')}`
