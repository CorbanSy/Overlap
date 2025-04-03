import tkinter as tk
from tkinter import ttk
import nltk
import random
from nltk.corpus import stopwords
from nltk import pos_tag, word_tokenize
from nltk.corpus import wordnet as wn
from functools import lru_cache

# Download necessary NLTK data (only the first time)
nltk.download('punkt')
nltk.download('punkt_tab')
nltk.download('averaged_perceptron_tagger')
nltk.download('averaged_perceptron_tagger_eng')
nltk.download('stopwords')
nltk.download('wordnet')

# Define 50 buckets with associated keywords (no subcategory mapping)
category_keywords = {
    "Italian Dining": ["italian", "pasta", "pizza", "dining", "restaurant"],
    "Sushi Dining": ["sushi", "japanese", "sashimi", "dining", "restaurant"],
    "American Dining": ["american", "burger", "steak", "dining", "restaurant"],
    "French Dining": ["french", "bistro", "wine", "dining", "restaurant"],
    "Mexican Dining": ["mexican", "taco", "burrito", "dining", "restaurant"],
    "Indian Dining": ["indian", "curry", "spicy", "dining", "restaurant"],
    "Chinese Dining": ["chinese", "noodle", "dumpling", "dining", "restaurant"],
    "Mediterranean Dining": ["mediterranean", "greek", "turkish", "dining", "restaurant"],
    "Steakhouse": ["steak", "grill", "barbecue", "dining", "restaurant"],
    "Seafood Dining": ["seafood", "fish", "crab", "dining", "restaurant"],
    "Cafe & Bakery": ["cafe", "bakery", "coffee", "pastry", "dining"],
    "Brunch Spot": ["brunch", "eggs", "pancake", "cafe", "dining"],
    "Gym": ["gym", "workout", "fitness", "exercise", "training"],
    "Yoga Studio": ["yoga", "pilates", "stretch", "wellness", "exercise"],
    "Pilates Studio": ["pilates", "core", "fitness", "exercise", "workout"],
    "CrossFit Gym": ["crossfit", "strength", "training", "workout", "fitness"],
    "Martial Arts Center": ["martial", "arts", "dojo", "karate", "self-defense"],
    "Dance Studio": ["dance", "ballet", "hip-hop", "studio", "movement"],
    "Hiking Club": ["hiking", "trail", "nature", "adventure", "outdoor"],
    "Outdoor Adventure": ["adventure", "outdoor", "explore", "nature", "trek"],
    "Camping Site": ["camping", "tent", "outdoor", "nature", "camp"],
    "Ski Resort": ["ski", "snow", "resort", "winter", "mountain"],
    "Movie Theater": ["cinema", "movie", "theater", "film", "screen"],
    "Indie Cinema": ["indie", "film", "cinema", "art", "movie"],
    "Documentary Theater": ["documentary", "film", "cinema", "educational", "movie"],
    "Gaming Arcade": ["arcade", "gaming", "video game", "play", "entertainment"],
    "Board Game Cafe": ["board game", "cafe", "games", "social", "entertainment"],
    "VR Gaming Center": ["vr", "virtual reality", "gaming", "arcade", "entertainment"],
    "Social Club": ["social", "club", "gather", "meet", "network"],
    "Networking Venue": ["networking", "business", "meet", "social", "events"],
    "Concert Hall": ["concert", "music", "live", "performance", "hall"],
    "Jazz Club": ["jazz", "music", "live", "club", "entertainment"],
    "Rock Concert Venue": ["rock", "music", "concert", "live", "venue"],
    "Boutique Store": ["boutique", "fashion", "clothing", "retail", "shop"],
    "Shopping Mall": ["mall", "shopping", "retail", "store", "fashion"],
    "Farmers Market": ["market", "farmers", "organic", "shopping", "fresh"],
    "Travel Agency": ["travel", "agency", "vacation", "trip", "tour"],
    "City Tour Service": ["tour", "city", "sightseeing", "travel", "guide"],
    "Art Gallery": ["art", "gallery", "exhibit", "painting", "sculpture"],
    "Museum": ["museum", "exhibit", "history", "art", "culture"],
    "Spa & Wellness": ["spa", "wellness", "relax", "therapy", "retreat"],
    "Meditation Center": ["meditation", "mindfulness", "quiet", "wellness", "relax"],
    "Learning Center": ["learning", "education", "workshop", "class", "seminar"],
    "Cooking Class": ["cooking", "culinary", "class", "food", "recipe"],
    "Nightclub": ["nightclub", "dance", "music", "party", "club"],
    "Bar": ["bar", "pub", "drink", "cocktail", "social"],
    "Pub": ["pub", "ale", "beer", "dining", "social"],
    "Dessert Cafe": ["dessert", "cafe", "sweet", "bakery", "pastry"],
    "Vegan Restaurant": ["vegan", "vegetarian", "healthy", "dining", "restaurant"],
    "Coffee House": ["coffee", "cafe", "brew", "espresso", "snack"]
}

# For demonstration, a list of 100 distinct activity place names.
activities_sample = [
    "La Bella Italian Restaurant",
    "Sunset Sushi Bar",
    "Urban Bistro",
    "Downtown Diner",
    "Riverside Cafe",
    "Golden Gate Grill",
    "The Gourmet Kitchen",
    "Spice Symphony",
    "Garden Eatery",
    "Cozy Corner Cafe",
    "Fitness Hub Gym",
    "Peak Performance Gym",
    "Iron Works Fitness",
    "Flex Zone",
    "Total Body Gym",
    "Pulse Fitness Center",
    "Zen Yoga Studio",
    "Flow Yoga & Pilates",
    "Balance Wellness Studio",
    "Mindful Movement",
    "Trailblazer Hiking Club",
    "Summit Trails",
    "Nature's Path",
    "Wilderness Walks",
    "Adventure Trek",
    "Cineplex 21",
    "Silver Screen Cinema",
    "Movie Magic Theater",
    "Blockbuster Theater",
    "Epic Films Cinema",
    "Retro Arcade",
    "Pixel Play Gaming Center",
    "Virtual Reality Hub",
    "Gamer's Den",
    "Arcade Kingdom",
    "Social Connect Lounge",
    "Community Hub",
    "Meet & Greet Cafe",
    "Urban Social Club",
    "Vibe Networking Spot",
    "Live Beats Music Hall",
    "Rhythm Lounge",
    "Melody Live Club",
    "Harmony Concert Hall",
    "Jazz Junction",
    "Urban Boutique",
    "Style Emporium",
    "Fashion Street",
    "Trendsetters Market",
    "Chic Retail Hub",
    "Wanderlust Travel Agency",
    "Globe Trotters",
    "Journey Junction",
    "Travelogue Tours",
    "Voyager Expeditions",
    "Artistic Expressions Gallery",
    "Creative Canvas",
    "Modern Art Museum",
    "Urban Art Space",
    "Sculpture Studio",
    "Serenity Spa",
    "Tranquil Retreat",
    "Blissful Wellness Spa",
    "Zen Retreat",
    "Calm Oasis",
    "Knowledge Learning Center",
    "Insight Academy",
    "The Seminar Hall",
    "Brain Boost Institute",
    "Workshop World",
    "Culinary Creations School",
    "Chef's Table Cooking Studio",
    "Baking Bliss",
    "Gourmet Cooking Classes",
    "Flavor Lab",
    "Night Owl Bar",
    "Twilight Lounge",
    "Moonlight Club",
    "Starlight Party Bar",
    "After Hours Lounge",
    "The Rustic Diner",
    "Ocean Breeze Seafood",
    "Mountain Peak Cafe",
    "Urban Street Food",
    "Vegan Delight",
    "Spice Route Restaurant",
    "Bistro Royale",
    "The Garden Grill",
    "Heavenly Desserts",
    "The Pancake House",
    "Elite Fitness Studio",
    "Cardio Blast Center",
    "Strength & Flex Gym",
    "Pure Yoga Sanctuary",
    "Hiking Haven",
    "Cinematic Experience",
    "Retro Gaming Arcade",
    "Urban Social Spot",
    "Artistic Vibes Gallery",
    "Chill & Thrill Nightclub"
]
activities = activities_sample  # 100 distinct items

# Global dictionary to store liked keywords grouped by bucket
liked_buckets = {}

# ------------------ NLTK Keyword Extraction ------------------
def extract_keywords_nltk(text, num_keywords=2):
    """
    Extract up to `num_keywords` single-word keywords from text using NLTK.
    The function tokenizes the text, removes stopwords, and selects only nouns.
    """
    tokens = word_tokenize(text)
    stop_words = set(stopwords.words("english"))
    filtered_tokens = [token for token in tokens if token.isalpha() and token.lower() not in stop_words]
    tagged = pos_tag(filtered_tokens)
    noun_tokens = [word for word, tag in tagged if tag.startswith("NN")]
    
    if not noun_tokens:
        from nltk import FreqDist
        freq_tokens = FreqDist(filtered_tokens)
        return [word for word, count in freq_tokens.most_common(num_keywords)]
    
    from nltk import FreqDist
    freq = FreqDist(noun_tokens)
    top_keywords = [word for word, count in freq.most_common(num_keywords)]
    return top_keywords

# ------------------ Caching for WordNet Synsets ------------------
@lru_cache(maxsize=1024)
def cached_synsets(word):
    return wn.synsets(word)

# ------------------ Enhanced Bucket Finder Using WordNet ------------------
def word_similarity(word1, word2):
    """
    Returns the maximum path similarity between any synset of word1 and any synset of word2.
    If no similarity is found, returns 0.
    """
    synsets1 = cached_synsets(word1)
    synsets2 = cached_synsets(word2)
    if not synsets1 or not synsets2:
        return 0
    max_sim = 0
    for syn1 in synsets1:
        for syn2 in synsets2:
            sim = syn1.path_similarity(syn2)
            if sim and sim > max_sim:
                max_sim = sim
    return max_sim

def find_bucket_for_keyword(keyword):
    """
    Determines the best bucket for the given keyword by computing semantic similarity
    between the keyword and candidate bucket words from category_keywords.
    """
    best_bucket = "Other"
    best_sim = 0.0

    # First, try a direct substring check for a quick match.
    for bucket, patterns in category_keywords.items():
        for pat in patterns:
            if pat in keyword.lower():
                return bucket

    # If no direct match, use WordNet similarity.
    for bucket, patterns in category_keywords.items():
        for pat in patterns:
            sim = word_similarity(keyword, pat)
            if sim > best_sim:
                best_sim = sim
                best_bucket = bucket
                # Early exit if a high similarity is found
                if best_sim > 0.5:
                    break
        if best_sim > 0.5:
            break
    return best_bucket

# ------------------ Generated Review Function ------------------
def generate_review(activity_text):
    """
    Dynamically builds a multi-paragraph review for a given activity
    by selecting sentence fragments from dictionaries.
    The review now also includes a description of what the place is about.
    """
    # Sentence fragment dictionaries
    service_phrases_positive = [
        "The service was great.",
        "The staff was exceptionally friendly.",
        "I was impressed with the service.",
        "Everything from the welcome to the little details was spot on."
    ]
    service_phrases_negative = [
        "The service was disappointing.",
        "The staff seemed indifferent and inattentive.",
        "I encountered poor service throughout my visit.",
        "Service left much to be desired."
    ]
    service_phrases_neutral = [
        "The service was okay.",
        "Service was average—nothing extraordinary.",
        "I found the service to be just fine.",
        "Service met my basic expectations."
    ]
    
    experience_phrases_positive = [
        "You know, when I'm on the road, I always seek out the local gems, and this spot did not disappoint.",
        "I'm the kind of person who loves discovering local favorites—and this one truly impressed me.",
        "Whenever I travel, I make it a point to try the signature drink at a new place, and it was simply amazing.",
        "This venue quickly became one of my cherished finds."
    ]
    experience_phrases_negative = [
        "When I'm traveling, I expect consistency, and sadly, this place did not deliver.",
        "I've had better experiences elsewhere, and this one was more of a miss than a hit.",
        "It left me underwhelmed, and I certainly won't be rushing back.",
        "The visit was a mixed bag that unfortunately leaned toward disappointment."
    ]
    experience_phrases_neutral = [
        "I often check out local spots while traveling, and this one was just average.",
        "It was a standard outing—nothing too memorable, but not terrible either.",
        "The experience was as expected, neither outstanding nor disappointing.",
        "It met my basic expectations for a quick stop."
    ]
    
    detail_templates = [
        "The atmosphere was {adj_atmosphere} and {adj_detail}, enhanced by {location_desc}.",
        "I was captivated by a {adj_detail} vibe, especially with {location_desc} in the background.",
        "The setting boasted a {adj_detail} charm, thanks in part to {location_desc}.",
        "It had a unique feel—{adj_atmosphere} yet {adj_detail}—with {location_desc} adding to the allure."
    ]
    adj_detail_list = ["vibrant", "cozy", "dynamic", "intimate", "rustic", "modern"]
    adj_atmosphere_list = ["lively", "tranquil", "energetic", "calming"]
    location_descriptors = [
        "a bustling downtown scene",
        "a quiet suburban nook",
        "the charm of a historic neighborhood",
        "a scenic urban backdrop",
        "a delightful local corner"
    ]
    
    closing_phrases_positive = [
        "I would highly recommend checking it out!",
        "I'll definitely be back soon.",
        "This place quickly earned a top spot on my list.",
        "It left quite an impression and I'm eager to return."
    ]
    closing_phrases_negative = [
        "Overall, the experience left much to be desired.",
        "I doubt I'll be returning anytime soon.",
        "It simply didn't live up to my expectations.",
        "I wouldn't recommend it based on my visits."
    ]
    closing_phrases_neutral = [
        "It was an average experience that met my expectations.",
        "I remain indifferent—nothing stood out particularly.",
        "It did the job, but I wouldn't go out of my way to return.",
        "It was a standard outing overall."
    ]
    
    multi_day_issue = (
        "During my visits, inconsistencies became apparent—one day the drink was decent, "
        "but on another, simple requests like 'no whipped cream' were completely ignored."
    )
    
    sentiment = random.choices(
        ["positive", "neutral", "negative"],
        weights=[0.5, 0.3, 0.2]
    )[0]
    
    # Determine bucket based on activity text using our improved matching
    bucket = find_bucket_for_keyword(activity_text)
    
    # Use a simple description for the bucket
    category_desc = f"a place known for its {bucket.lower()}"
    
    if sentiment == "positive":
        service_sentence = random.choice(service_phrases_positive)
        experience_sentence = random.choice(experience_phrases_positive)
    elif sentiment == "negative":
        service_sentence = random.choice(service_phrases_negative)
        experience_sentence = random.choice(experience_phrases_negative)
    else:
        service_sentence = random.choice(service_phrases_neutral)
        experience_sentence = random.choice(experience_phrases_neutral)
    
    paragraph1 = f"I recently visited '{activity_text}', {category_desc}. {service_sentence} {experience_sentence}"
    
    detail_template = random.choice(detail_templates)
    detail_sentence = detail_template.format(
        adj_atmosphere=random.choice(adj_atmosphere_list),
        adj_detail=random.choice(adj_detail_list),
        location_desc=random.choice(location_descriptors)
    )
    if sentiment == "negative":
        paragraph2 = f"{detail_sentence} {multi_day_issue}"
    else:
        paragraph2 = detail_sentence
    
    if sentiment == "positive":
        closing_sentence = random.choice(closing_phrases_positive)
    elif sentiment == "negative":
        closing_sentence = random.choice(closing_phrases_negative)
    else:
        closing_sentence = random.choice(closing_phrases_neutral)
    paragraph3 = closing_sentence
    
    review = "\n\n".join([paragraph1, paragraph2, paragraph3])
    return review

# ----------------------- GUI Setup -----------------------
root = tk.Tk()
root.title("Activity Recommendation with NLTK Keyword Extraction")
root.geometry("1000x650")

style = ttk.Style()
style.theme_use("clam")

main_frame = ttk.Frame(root, padding="10")
main_frame.grid(row=0, column=0, sticky="nsew")
root.columnconfigure(0, weight=1)
root.rowconfigure(0, weight=1)
main_frame.columnconfigure(0, weight=1)
main_frame.columnconfigure(1, weight=2)
main_frame.rowconfigure(0, weight=1)

# Left frame: List of activities
left_frame = ttk.Frame(main_frame)
left_frame.grid(row=0, column=0, sticky="nsew", padx=(0,10))
activities_label = ttk.Label(left_frame, text="Activities", font=("Helvetica", 14, "bold"))
activities_label.pack(anchor="w")
activity_listbox = tk.Listbox(left_frame, height=20, font=("Helvetica", 12))
activity_listbox.pack(side="left", fill="both", expand=True, pady=5)
list_scrollbar = ttk.Scrollbar(left_frame, orient="vertical", command=activity_listbox.yview)
list_scrollbar.pack(side="right", fill="y")
activity_listbox.configure(yscrollcommand=list_scrollbar.set)
for act in activities:
    activity_listbox.insert(tk.END, act)

# Right frame: Activity details and review display
right_frame = ttk.Frame(main_frame, relief="sunken", padding="10")
right_frame.grid(row=0, column=1, sticky="nsew")
details_label = ttk.Label(right_frame, text="Activity Details", font=("Helvetica", 14, "bold"))
details_label.pack(anchor="w")

details_text = tk.Text(right_frame, wrap="word", font=("Helvetica", 12), height=8)
details_text.pack(fill="both", expand=True, pady=5)
details_text.config(state="disabled")

review_label = ttk.Label(right_frame, text="Generated Review for the Activity:", font=("Helvetica", 12))
review_label.pack(anchor="w", pady=(10,0))
review_text = tk.Text(right_frame, wrap="word", font=("Helvetica", 12), height=4)
review_text.pack(fill="both", expand=True, pady=5)

button_frame = ttk.Frame(right_frame)
button_frame.pack(fill="x", pady=5)
like_button = ttk.Button(button_frame, text="Like Activity", command=lambda: on_like_activity())
like_button.pack(side="left", padx=(0, 10))
dislike_button = ttk.Button(button_frame, text="Dislike Activity", command=lambda: on_dislike_activity())
dislike_button.pack(side="left")

liked_buckets_label = ttk.Label(right_frame, text="Liked Buckets:", font=("Helvetica", 12, "bold"))
liked_buckets_label.pack(anchor="w", pady=(10,0))
liked_buckets_display = ttk.Label(right_frame, text="", font=("Helvetica", 12))
liked_buckets_display.pack(anchor="w")

# ----------------------- Event Handling -----------------------
def on_activity_select(event):
    """Update details panel and generate a review when an activity is selected."""
    selection = event.widget.curselection()
    if selection:
        index = selection[0]
        activity_text = event.widget.get(index)
        details_text.config(state="normal")
        details_text.delete("1.0", tk.END)
        details_text.insert(tk.END, f"Activity: {activity_text}\n")
        details_text.config(state="disabled")
        review = generate_review(activity_text)
        review_text.delete("1.0", tk.END)
        review_text.insert(tk.END, review)

activity_listbox.bind("<<ListboxSelect>>", on_activity_select)

def on_like_activity():
    """Extract keywords from the generated review and add them to liked buckets if the activity is liked."""
    review = review_text.get("1.0", tk.END).strip()
    if review:
        keywords = extract_keywords_nltk(review)
        for kw in keywords:
            bucket = find_bucket_for_keyword(kw)
            if bucket in liked_buckets:
                if kw not in liked_buckets[bucket]:
                    liked_buckets[bucket].append(kw)
            else:
                liked_buckets[bucket] = [kw]
        liked_text = ""
        for bucket, kw_list in liked_buckets.items():
            liked_text += f"{bucket}: {', '.join(kw_list)}\n"
        liked_buckets_display.config(text=liked_text)
    else:
        liked_buckets_display.config(text="No review text available to extract keywords.")

def on_dislike_activity():
    """Handle activity dislike: no keywords are stored."""
    liked_buckets_display.config(text="Activity disliked. No keywords added.")

# Pre-populate liked buckets for the first 50 activities
for activity in activities[:50]:
    review = generate_review(activity)
    keywords = extract_keywords_nltk(review)
    for kw in keywords:
        bucket = find_bucket_for_keyword(kw)
        if bucket in liked_buckets:
            if kw not in liked_buckets[bucket]:
                liked_buckets[bucket].append(kw)
        else:
            liked_buckets[bucket] = [kw]

liked_text = ""
for bucket, kw_list in liked_buckets.items():
    liked_text += f"{bucket}: {', '.join(kw_list)}\n"
liked_buckets_display.config(text=liked_text)

root.mainloop()
